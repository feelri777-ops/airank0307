import { useState } from 'react';
import styled from 'styled-components';
import { useTools } from '../../context/ToolContext';

const LOGO_OVERRIDES = {
  "notebooklm.google.com": "https://www.google.com/s2/favicons?domain=notebooklm.google&sz=64",
};

const getFaviconUrl = (url) => {
  try {
    const hostname = new URL(url).hostname;
    if (LOGO_OVERRIDES[hostname]) return LOGO_OVERRIDES[hostname];
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  }
  catch { return null; }
};

const SidebarContainer = styled.aside`
  width: 250px;
  flex-shrink: 0;
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: var(--r-md);
  padding: 1.2rem 1rem;
`;

const SidebarTitle = styled.h2`
    font-size: 1rem;
    font-weight: 700;
    margin-bottom: 1.2rem;
    color: var(--text-primary);
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-primary);
`;

const ToolList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const ToolItemStyled = styled.li`
  display: flex;
  align-items: center;
  margin-bottom: 1.25rem;
  cursor: pointer;
  border-radius: var(--r-sm);
  padding: 8px;
  transition: background-color 0.2s ease-in-out;

  &:hover {
      background-color: var(--bg-secondary-accent);
  }
`;

const ToolLogo = styled.img`
  width: 36px;
  height: 36px;
  border-radius: var(--r-xs);
  margin-right: 0.8rem;
  object-fit: cover;
  border: 1px solid var(--border-primary);
`;

const ToolInfo = styled.div`
  flex: 1;
  overflow: hidden;
`;

const ToolName = styled.h3`
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0 0 0.2rem 0;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ToolDescription = styled.p`
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;


function ToolItem_({ tool, rank, onClick }) {
  const [iconError, setIconError] = useState(false);
  const faviconUrl = getFaviconUrl(tool.url);

  return (
    <ToolItemStyled onClick={onClick} title={`자세히 보기: ${tool.name}`}>
      {!iconError && faviconUrl ? (
        <ToolLogo src={faviconUrl} alt={`${tool.name} logo`} onError={() => setIconError(true)} />
      ) : (
        <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', marginRight: '0.8rem', flexShrink: 0 }}>
          {tool.icon}
        </div>
      )}
      <ToolInfo>
        <ToolName>{tool.name}</ToolName>
        <ToolDescription>{tool.desc}</ToolDescription>
      </ToolInfo>
    </ToolItemStyled>
  );
}

function ToolListSidebar({ selectedArticle }) {
  const { tools, openToolDetail } = useTools();

  const getFilteredTools = () => {
    if (!selectedArticle) {
      return [...tools].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 10);
    }

    const text = (selectedArticle.title + " " + selectedArticle.description).toLowerCase();
    
    const filtered = tools.filter(tool => {
      const name = (tool.name || "").toLowerCase();
      const desc = (tool.desc || "").toLowerCase();
      const cat = (tool.category || "").toLowerCase();
      
      if (!name) return false;

      // 기사 텍스트에 도구 이름이나 카테고리가 직접 포함되어 있는지 확인
      const isDirectMatch = text.includes(name) || (cat && text.includes(cat)) || 
                          name.split(' ').some(word => word.length > 2 && text.includes(word));
                          
      // 카테고리별 연관 키워드 매칭
      const categoryMap = {
        '이미지': ['이미지', '사진', '디자인', '그림', '픽셀', '드로잉'],
        '챗봇': ['챗봇', '채팅', '대화', '질문', '답변', 'GPT', '제미나이', '클라우드'],
        '번역': ['번역', '통역', '다국어', '언어', '스피킹'],
        '코딩': ['코딩', '개발', '프로그래밍', '코드', '스크립트', '파이썬'],
        '비디오': ['비디오', '영상', '편집', '유튜브', '쇼츠', '크리에이터'],
        '음성': ['음성', '오디오', '음악', '작곡', '나레이션', '보이스']
      };

      const hasCategoryMatch = Object.keys(categoryMap).some(key => 
        cat.includes(key.toLowerCase()) && categoryMap[key].some(kw => text.includes(kw))
      );

      return isDirectMatch || hasCategoryMatch;
    });

    // 관련 도구가 부족하면 인기 도구로 채움
    if (filtered.length < 10) {
      const popular = [...tools].sort((a, b) => (b.score || 0) - (a.score || 0));
      const needed = 10 - filtered.length;
      const additional = popular.filter(p => !filtered.find(f => f.id === p.id)).slice(0, needed);
      return [...filtered, ...additional];
    }

    return filtered.slice(0, 10);
  };

  const displayTools = getFilteredTools();

  return (
    <SidebarContainer>
        <SidebarTitle>
          {selectedArticle ? '🔗 관련 AI 도구' : '🔥 오늘 TOP10 AI'}
        </SidebarTitle>
        <ToolList>
            {displayTools.map((tool, i) => (
                <ToolItem_
                  key={tool.id}
                  tool={tool}
                  rank={i + 1}
                  onClick={() => openToolDetail(tool, i + 1)}
                />
            ))}
        </ToolList>
    </SidebarContainer>
  );
}

export default ToolListSidebar;
