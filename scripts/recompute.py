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
    
    # 플랫폼명 제외한 핵심 이름 추출
    platform_names = ["amazon", "google", "microsoft", "adobe", "apple", "facebook", "github"]
    core_name = tool_name_lower
    for p in platform_names:
        core_name = core_name.replace(p, "")
    
    # 1. 도메인을 Host와 Path로 분리
    parts = domain_lower.split("/", 1)
    host = parts[0]
    path = parts[1] if len(parts) > 1 else ""

    # [Rule] 툴 네임이 도메인 / 뒤쪽(Path)에 붙는다면 무조건 페널티
    if len(core_name) > 2 and core_name in path:
        return 0.4 # 60% 감점 (부속 서비스)

    # [Rule] 툴 네임이 도메인 앞쪽(Host)에 붙어있다면 독립 브랜드 인정
    if len(core_name) > 2 and core_name in host:
        return 1.0 # 페널티 면제 (독립 브랜드)

    # 2. 일반적인 거대 플랫폼 페널티
    for platform in BIG_PLATFORMS:
        if platform in host:
            return 0.5 # 50% 감점
            
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

    print("--- Recomputing scores with 'Host vs Path' Smart Penalty ---")

    for tid, tool in tools.items():
        domain = id_to_domain.get(tid, "")
        name = id_to_name.get(tid, tid)
        metrics = tool.get('metrics', {})
        
        penalty = get_penalty(domain, name)
        
        # 원본 지표 추정 (지난번 저장이 이미 보정본일 수 있으므로 0.5/0.7/0.1 등으로 역산)
        # recompute.py를 여러번 실행할 때 스케일링이 중첩되지 않도록 안전장치
        opr = metrics.get('opr', 0)
        ntv = metrics.get('ntv', 0)
        sns = metrics.get('sns', 0)
        ghs = metrics.get('ghs', 0)

        # 이전 로직(0.7, 0.5, 1.0 등)의 흔적 제거 및 raw 복구
        # (현실적으로는 scores.json에 원본 metrics_raw를 따로 두는게 좋으나 현재 구조상 역산 시도)
        old_factor = 1.0
        if "gemini" in name.lower() or "gemini" in domain.lower(): old_factor = 1.0 # 지난번에 이미 1.0이었음
        elif "/" in domain: old_factor = 0.4
        elif any(p in domain.lower() for p in BIG_PLATFORMS): old_factor = 0.5
        
        # 안전한 역산을 위해 raw 데이터가 100을 넘지 않도록 조정
        raw_opr = min(100, opr / old_factor) if old_factor > 0 else opr
        raw_ntv = min(100, ntv / old_factor) if old_factor > 0 else ntv
        raw_sns = min(100, sns / old_factor) if old_factor > 0 else sns

        # 새 페널티 적용
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
            print(f"  [Penalty: Path-based or Platform] {name} ({domain}) Factor: {penalty}")

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

    print("Success: Host vs Path based smart penalty applied.")

if __name__ == "__main__":
    recompute()
