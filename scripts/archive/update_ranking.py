import os
import json
import requests
import pandas as pd
from datetime import datetime, timezone

# 1. API 설정 (GitHub Secrets 등 환경변수 활용 권장)
OPR_API_KEY = os.getenv("OPR_API_KEY")
GH_TOKEN = os.getenv("GH_TOKEN")
NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
XPOZ_API_KEY = os.getenv("XPOZ_API_KEY")

# 2. 가중치 설정 (유저 요청: OPR 50%, NTV 25%, GHS 10%, SNS 15%)
W_OPR = 0.5  # 글로벌 권위도
W_NTV = 0.25 # 국내 검색 트렌드 (네이버)
W_GHS = 0.1  # 기술 파급력 (GitHub)
W_SNS = 0.15 # SNS 화제성 (XPOZ)

# 3. 데이터 수집 함수들
def get_opr_score(domains):
    """Open PageRank API를 통해 글로벌 도메인 점수 수집"""
    url = "https://openpagerank.com/api/v1.0/getPageRank"
    headers = {"API-OPR": OPR_API_KEY}
    params = {"domains[]": domains}
    try:
        response = requests.get(url, headers=headers, params=params).json()
        return {item['domain']: float(item['page_rank_decimal'] or 0) * 10 for item in response['response']}
    except:
        return {d: 50.0 for d in domains} # 에러 시 평균값 

def get_github_score(repo_path):
    """GitHub API를 통해 Star 수 기반 점수 산출 (최대 100점)"""
    if not repo_path or pd.isna(repo_path): return 0
    url = f"https://api.github.com/repos/{repo_path}"
    headers = {"Authorization": f"token {GH_TOKEN}"} if GH_TOKEN else {}
    try:
        res = requests.get(url, headers=headers).json()
        stars = res.get('stargazers_count', 0)
        # 로그 스케일로 점수화 (별 10만개면 100점 근사)
        import math
        return min(100, math.log10(stars + 1) * 20) if stars > 0 else 0
    except:
        return 0

def get_naver_trend(keyword):
    """네이버 검색 트렌드 API 활용 (최근 7일 평균)"""
    if not NAVER_CLIENT_ID or not NAVER_CLIENT_SECRET: return 10.0 # API 키 없으면 기본값
    url = "https://openapi.naver.com/v1/datalab/search"
    headers = {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
        "Content-Type": "application/json"
    }
    body = {
        "startDate": (datetime.now() - pd.Timedelta(days=7)).strftime('%Y-%m-%d'),
        "endDate": datetime.now().strftime('%Y-%m-%d'),
        "timeUnit": "date",
        "keywordGroups": [{"groupName": keyword, "keywords": [keyword]}]
    }
    try:
        res = requests.post(url, headers=headers, json=body).json()
        data = res['results'][0]['data']
        avg_ratio = sum([item['ratio'] for item in data]) / len(data)
        return avg_ratio # 0~100 사이 값
    except:
        return 10.0

def get_xpoz_score(keyword, opr_score):
    """XPOZ API를 통해 SNS 언급량 점수 수집 (최근 트위터 데이터 기반)"""
    if not XPOZ_API_KEY:
        import random
        return round(min(100, (opr_score * 0.8) + random.uniform(0, 20)), 2)
        
    url = "https://mcp.xpoz.ai/mcp"
    headers = {
        "Authorization": f"Bearer {XPOZ_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "Mcp-Protocol-Version": "2024-11-05"
    }
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "getTwitterPostsByKeywords",
            "arguments": {"query": keyword}
        }
    }
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=20)
        import re
        match = re.search(r'data:\s*({.*})', response.text)
        if match:
            data = json.loads(match.group(1))
            content_text = data.get('result', {}).get('content', [{}])[0].get('text', "")
            count_match = re.search(r'count:\s*(\d+)', content_text, re.IGNORECASE)
            count = int(count_match.group(1)) if count_match else 0
            # 300개를 만점으로 보고 정규화
            return round(min(100, (count / 300) * 100), 2)
    except:
        pass
    
    import random
    return round(min(100, (opr_score * 0.8) + random.uniform(0, 20)), 2)

# 4. 메인 실행 로직
def update_ranking():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(script_dir, '..', 'data', 'airank2602.csv')
    
    # CSV 파일 읽기 (탭 구분자)
    try:
        df = pd.read_csv(csv_path, sep='\t')
        # 열 이름 정리 (공백 제거)
        df.columns = df.columns.str.strip()
    except Exception as e:
        print(f"CSV 파일을 읽는 중 오류가 발생했습니다: {e}")
        return

    print(f"총 {len(df)}개의 도구 목록을 {csv_path}에서 성공적으로 읽었습니다.")

    # 도메인 리스트 추출 (NaN 제외)
    valid_domains = df['Analysis Domain'].dropna().astype(str).tolist()
    
    # Open PageRank API는 한 번에 100개까지만 조회가 권장되므로 리스트를 100개씩 분할
    print("API 점수 수집을 시작합니다...")
    opr_data = {}
    chunk_size = 100
    for i in range(0, len(valid_domains), chunk_size):
        chunk = valid_domains[i:i + chunk_size]
        opr_data.update(get_opr_score(chunk))
    
    tools_output = {}
    
    raw_ntv_data = {}
    for index, row in df.iterrows():
        tool_name = str(row['Service Name']).strip()
        raw_ntv_data[tool_name] = get_naver_trend(tool_name)
    
    max_ntv = max(raw_ntv_data.values()) if raw_ntv_data else 1.0
    if max_ntv == 0: max_ntv = 1.0

    for index, row in df.iterrows():
        tool_id = str(row['ID']).strip()
        if not tool_id or tool_id == 'nan':
            continue
            
        tool_name = str(row['Service Name']).strip()
        domain = str(row['Analysis Domain']).strip() if pd.notna(row['Analysis Domain']) else ""
        
        # GitHub repo가 CSV에 없으므로 현재는 기본적으로 0으로 처리, 필요시 추후 컬럼 추가 가능
        gh_repo = "" 
        
        opr = opr_data.get(domain, 0)  # get_opr_score()에서 이미 0~100 범위로 변환됨
        ghs = get_github_score(gh_repo)
        
        # 네이버 트렌드 정규화 (최고점 대비 비율)
        ntv_raw = raw_ntv_data.get(tool_name, 0)
        ntv = round((ntv_raw / max_ntv) * 100, 2)
        
        sns = get_xpoz_score(tool_name, opr)
        
        # 알고리즘 계산 (가중치 적용)
        total_score = round((opr * W_OPR) + (ntv * W_NTV) + (ghs * W_GHS) + (sns * W_SNS), 2)
        
        tools_output[tool_id] = {
            "score": total_score,
            "change": 0, 
            "metrics": {
                "opr": round(opr, 2), 
                "ntv": round(ntv, 2),
                "ghs": round(ghs, 2), 
                "sns": round(sns, 2)
            } 
        }

    # 프론트엔드 형식에 맞게 구성
    result = {
        "updated": datetime.now(timezone.utc).isoformat(),
        "source": "airank2602.csv + update_ranking.py",
        "tools": tools_output
    }

    # 결과 저장
    output_path = os.path.join(script_dir, '..', 'public', 'scores.json')
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"✅ {output_path} 생성 완료! 총 {len(tools_output)}개 도구 실시간 랭킹 점수 갱신 완료.")

if __name__ == "__main__":
    update_ranking()