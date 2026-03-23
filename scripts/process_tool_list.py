import json
import os

folder = r'c:\Users\400041460038\Desktop\code main\airank0307-main (1)\tool list'
# The user gave me 5 files. Let's find all .txt files there and try to parse them.
files = [f for f in os.listdir(folder) if f.endswith('.txt')]

all_tools = []
unique_names = set()

# Fields that might be in the source vs what our admin expects
mapping = {
    'category': 'cat',
    'description': 'desc',
    'one_line_review': 'oneLineReview',
    'oneLine_review': 'oneLineReview',
    'one_line': 'oneLineReview',
    'pros_cons': 'prosCons',
    'usage_score': 'usage',
    'tech_score': 'tech',
    'buzz_score': 'buzz',
    'utility_score': 'utility',
    'growth_score': 'growth',
    'total_score': 'score',
    'korean_support': 'koSupport',
    'ko_support': 'koSupport'
}

for f in files:
    path = os.path.join(folder, f)
    with open(path, 'r', encoding='utf-8') as file:
        try:
            content = json.load(file)
            tools = []
            if isinstance(content, list):
                tools = content
            elif isinstance(content, dict):
                if 'data' in content:
                    tools = content['data']
                else:
                    tools = [content]
            
            for t in tools:
                if not isinstance(t, dict): continue
                if 'rank' not in t or 'name' not in t: continue
                
                # Normalize keys
                normalized = {}
                for k, v in t.items():
                    target_key = mapping.get(k, k)
                    normalized[target_key] = v
                
                # Check for duplicates
                name_key = normalized.get('name', '').lower()
                if name_key and name_key not in unique_names:
                    # Clean tags: sometimes they are just strings with #
                    if 'tags' in normalized and isinstance(normalized['tags'], list):
                        normalized['tags'] = [tag.lstrip('#') for tag in normalized['tags']]
                    
                    # Ensure score is numeric
                    for score_key in ['usage', 'tech', 'buzz', 'utility', 'growth', 'score']:
                        if score_key in normalized:
                            try:
                                normalized[score_key] = float(normalized[score_key])
                            except:
                                normalized[score_key] = 0
                                
                    all_tools.append(normalized)
                    unique_names.add(name_key)
                    
        except Exception as e:
            print(f'Error processing {f}: {e}')

# Sort by rank
all_tools.sort(key=lambda x: x.get('rank', 999))

output_path = os.path.join(folder, 'unified_tools.json')
with open(output_path, 'w', encoding='utf-8') as out:
    json.dump({'tools': all_tools}, out, ensure_ascii=False, indent=2)

print(f'Successfully unified {len(all_tools)} tools into {output_path}')
