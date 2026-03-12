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

# Big platforms (Basic filter)
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
    
    # [NEW RULE] 만약 서비스명(예: Gemini)이 도메인(예: gemini.google.com)에 포함되어 있다면 
    # 독립된 서비스 브랜드로 인정하여 페널티 "면제" (100% 인정)
    # 단, 플랫폼명(amazon, google 등) 자체가 서비스명인 경우는 일반 트래픽으로 간주하여 제외
    platform_names = ["amazon", "google", "microsoft", "adobe", "apple", "facebook", "github"]
    is_genuine_brand = False
    
    # 툴 이름 중 플랫폼 명을 제외한 핵심 단어가 도메인에 있는지 확인
    core_name = tool_name_lower
    for p in platform_names:
        core_name = core_name.replace(p, "")
    
    if len(core_name) > 2 and core_name in domain_lower:
        is_genuine_brand = True

    if is_genuine_brand:
        return 1.0 # 페널티 면제!

    # Path-based domains (50% 인정)
    if "/" in domain:
        return 0.5
    
    # Big platforms without brand name in domain (50% 인정)
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

    tools = scores_data.get('tools', {})
    updated_tools = {}

    print("--- Recomputing scores with 'Genuine Brand Exemption' ---")

    for tid, tool in tools.items():
        domain = id_to_domain.get(tid, "")
        name = id_to_name.get(tid, tid)
        metrics = tool.get('metrics', {})
        
        penalty = get_penalty(domain, name)
        
        # Restore raw metrics first (assuming previously they were shrunk by 0.1/0.15 or 0.5/0.4)
        # We need to reach the original baseline. Let's use history or just inverse the scaling.
        # For simplicity and accuracy, we assume the user wants the BEST possible 100% for genuine brands.
        
        # RAW 지표 복구 로직 (이미 페널티가 먹은 상태라면 원복)
        opr = metrics.get('opr', 0)
        ntv = metrics.get('ntv', 0)
        sns = metrics.get('sns', 0)
        ghs = metrics.get('ghs', 0)

        # Check existing shrinkage (scores.json에 페널티가 반영된 OPR이 들어있음)
        # 이전 실행에서 0.5 또는 0.15 등이 적용되었을 것임.
        # 여기서는 극단적으로 raw 데이터를 다시 계산하기 위해 역산을 하거나
        # 혹은 recompute.py가 매번 원본에 가깝게 동작하도록 유도함.
        # (이미 9a73c8b 커밋에서 0.7 혹은 0.5 등으로 저장됨)
        # 이번에는 정교하게 1.0(면제)을 주는 것이 목표.
        
        raw_opr, raw_ntv, raw_sns = opr, ntv, sns
        
        # 이전 로직 기반 역산 (Gemini 등은 0.7이 적용되어 있었음)
        old_factor = 1.0
        if "gemini" in name.lower() or "gemini" in domain.lower(): old_factor = 0.7
        elif "/" in domain: old_factor = 0.4
        elif any(p in domain.lower() for p in BIG_PLATFORMS): old_factor = 0.5
        
        if old_factor < 1.0:
            raw_opr = opr / old_factor
            raw_ntv = ntv / old_factor
            raw_sns = sns / old_factor

        # Apply New Smart Penalty
        new_opr = raw_opr * penalty
        new_ntv = raw_ntv * penalty
        new_sns = raw_sns * penalty

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
        if penalty == 1.0 and old_factor < 1.0:
            print(f"  [Exempted] {name} ({domain}) - Brand identified, 100% score restored!")

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
        print(f"Report Error: {e}")

    print("Success: Smart brand exemption applied.")

if __name__ == "__main__":
    recompute()
