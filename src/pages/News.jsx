
import { useState } from 'react';
import styled from 'styled-components';
import { useNews } from '../context/NewsContext';
import { useAuth } from '../context/AuthContext';
import ToolListSidebar from '../components/layout/ToolListSidebar';

const NewsPageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
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
`;

const MainContent = styled.main`
  flex-grow: 1;
  min-width: 0;
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
  outline: none;
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
  padding: 1.5rem 0;
  transition: background-color 0.2s;

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
  transition: all 0.2s;

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
  transition: all 0.2s ease;
  z-index: 5;

  &:hover {
    transform: scale(1.2);
    color: #ffc107;
  }
`;

const PAGE_SIZE = 15;

function NewsPage() {
  const { user } = useAuth();
  const { news, selectedArticle, setSelectedArticle, toggleNewsBookmark, isNewsBookmarked } = useNews();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState('');

  const handleItemClick = (item) => {
    setSelectedArticle(item);
  };

  const handleBookmarkClick = (e, item) => {
    e.stopPropagation();
    toggleNewsBookmark(item);
  };

  const allItems = news?.items || [];
  const filteredItems = searchQuery.trim()
    ? allItems.filter(item =>
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allItems;
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
      <SidebarWrapper><ToolListSidebar /></SidebarWrapper>
      <MainContent>
        <NewsList>
          {visibleItems.map((item) => {
            const isBookmarked = isNewsBookmarked(item.link);
            return (
              <NewsItem 
                key={item.link} 
                onClick={() => handleItemClick(item)} 
                style={{backgroundColor: selectedArticle?.link === item.link ? 'var(--bg-secondary-accent)' : 'transparent'}}
              >
                <NewsContent>
                  <NewsLink href={item.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                    <NewsTitle>{item.title}</NewsTitle>
                    <NewsDescription>{item.description}</NewsDescription>
                    <NewsMeta>{item.relativeTime}</NewsMeta>
                  </NewsLink>
                </NewsContent>
                {user && (
                  <BookmarkButton 
                    bookmarked={isBookmarked}
                    onClick={(e) => handleBookmarkClick(e, item)}
                    title={isBookmarked ? "북마크 제거" : "북마크 추가"}
                  >
                    {isBookmarked ? '★' : '☆'}
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
