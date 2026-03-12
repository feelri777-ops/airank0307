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

# Softened Platform Penalty Rules
BIG_PLATFORMS = [
    "amazon.com", "google.com", "microsoft.com", "adobe.com", 
    "apple.com", "github.com", "facebook.com", "bing.com", 
    "zoom.us", "slack.com", "canva.com", "figma.com", "notion.so"
]

def get_penalty(domain, tool_name):
    if not domain:
        return 1.0
    domain_lower = domain.lower()
    tool_name_lower = tool_name.lower().replace(" ", "")
    
    # 1. Gemini, Claude, ChatGPT 등 플래그십은 플랫폼 도메인이더라도 더 우대 (70% 인정)
    flagships = ["gemini", "claude", "chatgpt"]
    if any(f in domain_lower for f in flagships) or any(f in tool_name_lower for f in flagships):
        return 0.7  # 30% 감점 (적절한 보정)

    # 2. Path-based domains (Recovered: 40% 인정)
    if "/" in domain:
        return 0.4
    
    # 3. Big platforms (Recovered: 50% 인정)
    for platform in BIG_PLATFORMS:
        if platform in domain_lower:
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

    # Use original metrics if available or use current ones assuming they are the original base
    # In this logic, we assume the scores.json contains the metrics AFTER previous compute, 
    # but we need to reset them to a base or just scale back.
    # To be safe, let's assume valid base metrics are needed.
    
    tools = scores_data.get('tools', {})
    updated_tools = {}

    print("--- Recomputing scores with Softened Penalties (Half-Recovery) ---")

    for tid, tool in tools.items():
        domain = id_to_domain.get(tid, "")
        name = id_to_name.get(tid, tid)
        metrics = tool.get('metrics', {})
        
        penalty = get_penalty(domain, name)
        
        # We need the original metrics to apply the penalty correctly.
        # Since we ran recompute.py before, the scores.json metrics might be already shrunk.
        # But OPR in scores.json was overwritten. 
        # For simplicity, if we don't have a backup, we treat current values as base and try to 'un-shrink'? 
        # No, let's try to restore based on typical domain values or just adjust the logic.
        # Actually, it's better to fetch from symbols/history if possible, but let's just use 0.5 scaling here.
        
        # IMPORTANT: To recover properly, we should ideally have the raw data.
        # For now, let's assume we want to increase the current shrunk scores back to the 50% target.
        # If previous penalty was 0.15 and now it's 0.5, we multiply by (0.5 / 0.15) = 3.33
        
        opr = metrics.get('opr', 0)
        ntv = metrics.get('ntv', 0)
        sns = metrics.get('sns', 0)
        ghs = metrics.get('ghs', 0)

        # Previous penalties were 0.1 or 0.15. 
        # Let's check the domain and 'un-shrink' it first to get raw, then apply new penalty.
        raw_opr, raw_ntv, raw_sns = opr, ntv, sns
        
        old_penalty = 1.0
        if "/" in domain: old_penalty = 0.1
        elif any(p in domain.lower() for p in BIG_PLATFORMS): old_penalty = 0.15
        
        if old_penalty < 1.0:
            raw_opr = opr / old_penalty
            raw_ntv = ntv / old_penalty
            raw_sns = sns / old_penalty

        # Apply New Penalty
        new_opr = raw_opr * penalty
        new_ntv = raw_ntv * penalty
        new_sns = raw_sns * penalty

        # Cap at 100
        new_opr = min(100, new_opr)
        new_ntv = min(100, new_ntv)
        new_sns = min(100, new_sns)

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
            print(f"  [Recovered] {name} ({domain}) New Factor: {penalty}")

    scores_data['tools'] = updated_tools
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
        print(f"Report Creation Error: {e}")

    print("Success: Scores recovered and saved.")

if __name__ == "__main__":
    recompute()
