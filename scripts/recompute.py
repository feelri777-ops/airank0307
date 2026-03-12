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

# Platform Penalty Rules
BIG_PLATFORMS = [
    "amazon.com", "google.com", "microsoft.com", "adobe.com", 
    "apple.com", "github.com", "facebook.com", "bing.com", 
    "zoom.us", "slack.com", "canva.com", "figma.com", "notion.so"
]

def get_penalty(domain):
    if not domain:
        return 1.0
    domain_lower = domain.lower()
    
    # Path-based domains (heavy penalty)
    if "/" in domain:
        return 0.1
    
    # Big platforms (heavy penalty)
    for platform in BIG_PLATFORMS:
        if platform in domain_lower:
            return 0.15
            
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

    print("--- Recomputing scores with platform penalties ---")

    for tid, tool in tools.items():
        domain = id_to_domain.get(tid, "")
        metrics = tool.get('metrics', {})
        
        penalty = get_penalty(domain)
        
        opr = metrics.get('opr', 0)
        ntv = metrics.get('ntv', 0)
        ghs = metrics.get('ghs', 0)
        sns = metrics.get('sns', 0)

        if penalty < 1.0:
            opr *= penalty
            ntv *= penalty
            sns *= penalty
            print(f"  [Penalty] {id_to_name.get(tid, tid)} ({domain}) x{penalty}")

        total_score = round((opr * W_OPR) + (ntv * W_NTV) + (ghs * W_GHS) + (sns * W_SNS), 2)

        updated_tools[tid] = tool.copy()
        updated_tools[tid]['score'] = total_score
        updated_tools[tid]['metrics'] = {
            'opr': round(opr, 2),
            'ntv': round(ntv, 2),
            'ghs': round(ghs, 2),
            'sns': round(sns, 2)
        }

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

    print("Success: Scores recomputed and saved.")

if __name__ == "__main__":
    recompute()
