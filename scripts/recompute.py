import json
import csv
import os
from datetime import datetime

# Settings
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCORES_PATH = os.path.join(BASE_DIR, '..', 'public', 'scores.json')
CSV_PATH = os.path.join(BASE_DIR, '..', 'data', 'airank2602.csv')
REPORT_PATH = os.path.join(BASE_DIR, '..', 'ai_rank_full_report.csv')

# Weights
W_OPR = 0.5
W_NTV = 0.3
W_GHS = 0.1
W_SNS = 0.1

# Big platforms
BIG_PLATFORMS = [
    "amazon.com", "google.com", "microsoft.com", "adobe.com", 
    "apple.com", "github.com", "facebook.com", "bing.com", 
    "zoom.us", "slack.com", "canva.com", "figma.com", "notion.so"
]

def get_penalty(domain, tool_name):
    if not domain:
        return 1.0
    
    domain_lower = domain.lower()
    tool_name_lower = tool_name.lower().replace(" ", "").replace("-", "").replace(".", "")
    
    # Extract core name by removing platform names
    platform_names = ["amazon", "google", "microsoft", "adobe", "apple", "facebook", "github"]
    core_name = tool_name_lower
    for p in platform_names:
        core_name = core_name.replace(p, "")
    
    parts = domain_lower.split("/", 1)
    host = parts[0]
    path = parts[1] if len(parts) > 1 else ""

    # [REVISED RULE] User requested consistent 50% penalty (0.5 factor) for non-standalone/platform services
    
    # 1. If name is in path -> 50% Penalty
    if len(core_name) > 2 and core_name in path:
        return 0.5

    # 2. If name is in host -> standalone brand (100% score)
    if len(core_name) > 2 and core_name in host:
        return 1.0

    # 3. If it's a known big platform but name not matched -> 50% Penalty
    for platform in BIG_PLATFORMS:
        if platform in host:
            return 0.5
            
    return 1.0

def recompute():
    if not os.path.exists(SCORES_PATH):
        print("Error: scores.json not found.")
        return

    with open(SCORES_PATH, 'r', encoding='utf-8') as f:
        scores_data = json.load(f)

    id_to_domain = {}
    id_to_name = {}
    try:
        with open(CSV_PATH, 'r', encoding='utf-8') as f:
            reader = csv.reader(f, delimiter='\t')
            next(reader) 
            for row in reader:
                if len(row) >= 3:
                    tid, name, domain = row[0].strip(), row[1].strip(), row[2].strip()
                    id_to_domain[tid] = domain
                    id_to_name[tid] = name
    except Exception as e:
        print(f"CSV Read Error: {e}")

    tools = scores_data.get('tools', {})
    updated_tools = {}

    print("--- Recomputing scores with Consistent 50% Penalty ---")

    for tid, tool in tools.items():
        domain = id_to_domain.get(tid, "")
        name = id_to_name.get(tid, tid)
        metrics = tool.get('metrics', {})
        
        penalty = get_penalty(domain, name)
        
        opr = metrics.get('opr', 0)
        ntv = metrics.get('ntv', 0)
        sns = metrics.get('sns', 0)
        ghs = metrics.get('ghs', 0)

        # Restore raw metrics first based on PREVIOUS logic to ensure we don't multiply penalties
        # Previous recompute.py and github states used 0.7, 0.4, 0.5 etc.
        # Let's use a safe normalization approach: scale current metrics back to raw estimate
        # (Assuming the most recent recompute results are what we see in metrics)
        
        old_factor = 1.0
        # This part estimates the factor used in the *current* scores.json to reverse it.
        # gemini was 1.0, github copilot was 0.4, others were 0.5.
        if "gemini" in name.lower() or "gemini" in domain.lower(): old_factor = 1.0
        elif "/" in domain: old_factor = 0.4 # from previous script version
        elif any(p in domain.lower() for p in BIG_PLATFORMS): old_factor = 0.5
        
        raw_opr = min(100, opr / old_factor) if old_factor > 0 else opr
        raw_ntv = min(100, ntv / old_factor) if old_factor > 0 else ntv
        raw_sns = min(100, sns / old_factor) if old_factor > 0 else sns

        # Apply New Standardized Penalty (0.5 for all non-standalone cases)
        new_opr = raw_opr * penalty
        new_ntv = raw_ntv * penalty
        new_sns = raw_sns * penalty

        total_score = round((new_opr * W_OPR) + (new_ntv * W_NTV) + (ghs * W_GHS) + (new_sns * W_SNS), 2)

        updated_tools[tid] = tool.copy()
        updated_tools[tid]['score'] = total_score
        updated_tools[tid]['metrics'] = {
            'opr': round(new_opr, 2),
            'ntv': round(new_ntv, 2),
            'ghs': round(ghs, 2),
            'sns': round(new_sns, 2)
        }
        if penalty < 1.0:
            print(f"  [Penalty 50%] {name} ({domain}) applied.")

    scores_data['updated'] = datetime.utcnow().isoformat() + 'Z'
    
    with open(SCORES_PATH, 'w', encoding='utf-8') as f:
        json.dump(scores_data, f, indent=2, ensure_ascii=False)

    try:
        sorted_tools = []
        for tid, tinfo in updated_tools.items():
            sorted_tools.append({
                'id': tid,
                'name': id_to_name.get(tid, 'Unknown'),
                'domain': id_to_domain.get(tid, ''),
                'score': tinfo['score'],
                'metrics': tinfo['metrics']
            })
        sorted_tools.sort(key=lambda x: x['score'], reverse=True)

        with open(REPORT_PATH, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['순위', 'ID', '툴이름', '도메인', '종합점수', '구글(50%)', '네이버(30%)', 'SNS(10%)', '깃허브(10%)'])
            for idx, t in enumerate(sorted_tools):
                m = t['metrics']
                writer.writerow([idx+1, t['id'], t['name'], t['domain'], t['score'], m['opr'], m['ntv'], m['sns'], m['ghs']])
    except Exception as e:
        print(f"Report Error: {e}")

    print("Success: Standardized 50% penalty applied.")

if __name__ == "__main__":
    recompute()
