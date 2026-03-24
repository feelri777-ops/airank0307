
import { useState } from 'react';
import styled from 'styled-components';
import { useNews } from '../context/NewsContext';
import { useAuth } from '../context/AuthContext';
import ToolListSidebar from '../components/layout/ToolListSidebar';
import Icon from '../components/ui/Icon';

const NewsPageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  display: flex;
  flex-direction: column;
`;

const PageHeader = styled.div`
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const SearchWrapper = styled.div`
  position: relative;
  width: 100%;
  max-width: 600px;
`;

const UpdatedAt = styled.span`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.75rem;
  color: var(--text-muted);
  white-space: nowrap;
  pointer-events: none;
`;

const ContentRow = styled.div`
  display: flex;
  gap: 2.5rem;
  align-items: flex-start;
  margin-top: 1rem;
`;

const MainContent = styled.main`
  flex-grow: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const CategoryTabs = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 1.5rem;
  overflow-x: auto;
  padding: 4px 0;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

const CategoryTab = styled.button`
  padding: 8px 16px;
  border-radius: 100px;
  border: 1px solid ${props => props.active ? 'var(--accent-indigo)' : 'var(--border-primary)'};
  background: ${props => props.active ? 'var(--accent-indigo)' : 'var(--bg-secondary)'};
  color: ${props => props.active ? 'white' : 'var(--text-secondary)'};
  font-size: 0.88rem;
  font-weight: ${props => props.active ? 700 : 500};
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s, color 0.2s, border-color 0.2s, transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    border-color: var(--accent-indigo);
    background: ${props => props.active ? 'var(--accent-indigo)' : 'rgba(99, 102, 241, 0.05)'};
  }
`;

const SidebarWrapper = styled.div`
  position: sticky;
  top: 80px;
  align-self: start;
  flex-shrink: 0;

  @media (max-width: 900px) {
    display: none;
  }
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  margin-bottom: 1rem;
  color: var(--text-primary);
  text-align: center;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.65rem 8rem 0.65rem 1rem;
  border-radius: var(--r-sm);
  border: 1px solid var(--border-primary);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.95rem;
  box-sizing: border-box;

  &::placeholder {
    color: var(--text-muted);
  }

  &:focus {
    border-color: var(--accent-indigo, #6366f1);
  }
`;

const NewsList = styled.ul`
  list-style: none;
  padding: 0;
`;

const NewsItem = styled.li`
  position: relative;
  border-bottom: 1px solid var(--border-primary);
  padding: 1.5rem 1rem;
  transition: background 0.3s ease, color 0.3s ease, border-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
  border-left: 3px solid transparent;
  cursor: pointer;

  &:hover {
    background: var(--bg-secondary);
  }

  &.active {
    background: var(--bg-secondary-accent);
    border-left-color: var(--accent-indigo);
    transform: translateX(4px);
  }

  &:last-child {
    border-bottom: none;
  }
`;

const NewsContent = styled.div`
  padding-right: 2.5rem; // Space for the bookmark button
`;

const NewsLink = styled.a`
  text-decoration: none;
  color: inherit;

  &:hover h2 {
    color: var(--accent-blue);
  }
`;

const NewsTitle = styled.h2`
  font-size: 1.3rem;
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
  transition: color 0.2s;
`;

const NewsDescription = styled.p`
  color: var(--text-secondary);
  margin: 0 0 0.5rem 0;
`;

const NewsMeta = styled.span`
  font-size: 0.9rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 12px;
`;

const NewsViewCount = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const LoadMoreButton = styled.button`
  display: block;
  margin: 2rem auto 0;
  padding: 0.75rem 2.5rem;
  background: transparent;
  border: 1px solid var(--border-primary);
  border-radius: var(--r-sm);
  color: var(--text-secondary);
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s, transform 0.2s, box-shadow 0.2s;

  &:hover {
    border-color: var(--accent-blue);
    color: var(--accent-blue);
  }
`;

const BookmarkButton = styled.button`
  position: absolute;
  top: 1.2rem;
  right: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  font-size: 1.3rem;
  color: ${props => (props.bookmarked ? '#ffc107' : 'var(--text-muted)')};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  z-index: 5;

  &:hover {
    transform: scale(1.2);
    color: #ffc107;
  }
`;

const PAGE_SIZE = 15;

const CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'hot', label: '🔥 HOT 뉴스', isHot: true },
  { id: 'tech', label: 'AI 기술/트렌드', keywords: ['AI', '인공지능', '챗GPT', '생성형', 'LLM', 'GPT', '제미나이', '클라우드', '튜터', '에듀테크', '이미지', '회화'] },
  { id: 'it', label: 'IT/서비스', keywords: ['IT', '소프트웨어', '클라우드', '플랫폼', '서비스', '앱', '모바일', '보안', '데이터', '디지털'] },
  { id: 'hw', label: '반도체/하드웨어', keywords: ['반도체', '하드웨어', '칩', '엔비디아', 'HBM', 'GPU', 'CPU', '서버', '메모리', '조선', '중공업', '로봇', '미래차'] },
  { id: 'policy', label: '정책/거버넌스', keywords: ['정책', '정부', '규제', '법', '선거', '국회', '시청', '도청', '협의회', '예산', '지원금'] },
  { id: 'biz', label: '비즈니스/경제', keywords: ['산업', '기업', '비즈니스', '주가', '증시', '실적', '공장', '삼성', 'LG', 'SK', '주주', '투자', '매출'] },
];

function NewsPage() {
  const { user } = useAuth();
  const { news, toggleNewsBookmark, isNewsBookmarked, incrementNewsView, newsStats } = useNews();
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const handleItemClick = (item) => {
    setSelectedArticle(item);
    incrementNewsView(item.link);
  };

  const handleBookmarkClick = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    toggleNewsBookmark(item);
  };

  const allItems = news?.items || [];
  
  // 카테고리 및 검색 필터링
  const filteredItems = allItems.filter(item => {
    // 검색어 필터
    const matchesSearch = !searchQuery.trim() || 
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    // 카테고리 필터
    const cat = CATEGORIES.find(c => c.id === activeTab);
    if (!cat || cat.id === 'all') return true;
    if (cat.isHot) return item.hot;
    
    return cat.keywords.some(k => 
      item.title?.toLowerCase().includes(k.toLowerCase()) || 
      item.description?.toLowerCase().includes(k.toLowerCase())
    );
  });

  const visibleItems = filteredItems.slice(0, visibleCount);
  const hasMore = visibleCount < filteredItems.length;

  return (
    <NewsPageContainer>
      <PageHeader>
        <PageTitle>📰 최신 AI 뉴스</PageTitle>
        <SearchWrapper>
          <SearchInput
            type="text"
            placeholder="뉴스 검색..."
            aria-label="뉴스 검색"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(PAGE_SIZE); }}
          />
          {news?.lastUpdated && (
            <UpdatedAt>
              갱신 {new Date(news.lastUpdated).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </UpdatedAt>
          )}
        </SearchWrapper>
      </PageHeader>
      <ContentRow>
      <SidebarWrapper>
        <ToolListSidebar selectedArticle={selectedArticle} />
      </SidebarWrapper>
      <MainContent>
        <CategoryTabs>
          {CATEGORIES.map(cat => (
            <CategoryTab 
              key={cat.id} 
              active={activeTab === cat.id}
              onClick={() => { setActiveTab(cat.id); setVisibleCount(PAGE_SIZE); }}
            >
              {cat.label}
            </CategoryTab>
          ))}
        </CategoryTabs>
        
        <NewsList>
          {visibleItems.map((item) => {
            const isBookmarked = isNewsBookmarked(item.link);
            const views = newsStats[item.link] || 0;
            return (
              <NewsItem 
                key={item.link} 
                className={selectedArticle?.link === item.link ? 'active' : ''}
                onClick={() => handleItemClick(item)} 
              >
                <NewsContent>
                  <NewsLink 
                    href={item.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      handleItemClick(item); 
                      window.open(item.link, '_blank');
                    }}
                  >
                    <NewsTitle>{item.title}</NewsTitle>
                    <NewsDescription>{item.description}</NewsDescription>
                    <NewsMeta>
                      <span>{item.relativeTime}</span>
                      <NewsViewCount>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256">
                          <path d="M247.31,124.76c-.35-.79-8.82-19.74-27.65-38.57C194.57,61,162.06,48,128,48S61.43,61,36.34,86.19c-18.83,18.83-27.3,37.78-27.65,38.57a12,12,0,0,0,0,9.48c.35.79,8.82,19.74,27.65,38.57C61.43,195,93.94,208,128,208s66.57-13,91.66-38.19c18.83-18.83,27.3-37.78,27.65-38.57A12,12,0,0,0,247.31,124.76ZM128,192c-30.78,0-59.91-11.58-82-32.61a100.28,100.28,0,0,1-19.16-24.52c4.19-7.29,11-17.2,20.84-27.04C69.74,85.78,98.87,74.21,128,74.21s58.26,11.57,80.32,33.62c9.84,9.84,16.65,19.75,20.84,27.04a100.28,100.28,0,0,1-19.16,24.52C187.91,180.42,158.78,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z"></path>
                        </svg>
                        {views > 999 ? (views / 1000).toFixed(1) + 'k' : views}
                      </NewsViewCount>
                    </NewsMeta>
                  </NewsLink>
                </NewsContent>
                {user && (
                  <BookmarkButton 
                    bookmarked={isBookmarked}
                    onClick={(e) => handleBookmarkClick(e, item)}
                    title={isBookmarked ? "북마크 제거" : "북마크 추가"}
                  >
                    <Icon 
                      name={isBookmarked ? 'star-fill' : 'star'} 
                      size={20} 
                      color={isBookmarked ? '#ffc107' : 'var(--text-muted)'} 
                    />
                  </BookmarkButton>
                )}
              </NewsItem>
            );
          })}
        </NewsList>
        {hasMore && (
          <LoadMoreButton onClick={() => setVisibleCount(v => v + PAGE_SIZE)}>
            더보기
          </LoadMoreButton>
        )}
      </MainContent>
      </ContentRow>
    </NewsPageContainer>
  );
}

export default NewsPage;
