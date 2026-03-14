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
  border-radius: 16px;
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
  border-radius: 8px;
  padding: 8px;
  transition: background-color 0.2s ease-in-out;

  &:hover {
      background-color: var(--bg-secondary-accent);
  }
`;

const ToolLogo = styled.img`
  width: 36px;
  height: 36px;
  border-radius: 6px;
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

function ToolListSidebar() {
  const { tools, openToolDetail } = useTools();

  const sortedTools = [...tools].sort((a, b) => b.score - a.score).slice(0, 10);

  return (
    <SidebarContainer>
        <SidebarTitle>오늘 TOP10 AI</SidebarTitle>
        <ToolList>
            {sortedTools.map((tool, i) => (
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
