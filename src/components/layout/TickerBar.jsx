import { useNews } from "../../context/NewsContext";
import styled, { keyframes } from "styled-components";

const ticker = keyframes`
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-100%);
  }
`;

const TickerContainer = styled.div`
  width: 100%;
  overflow: hidden;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-primary);
  border-bottom: 1px solid var(--border-primary);
`;

const TickerWrapper = styled.div`
  display: flex;
  animation: ${ticker} 40s linear infinite;
`;

const TickerItem = styled.a`
  flex-shrink: 0;
  padding: 10px 20px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  white-space: nowrap;
  text-decoration: none;

  &:hover {
    color: var(--accent-blue);
  }
`;

const TickerBar = () => {
  const { news } = useNews();

  if (!news || !news.items || news.items.length === 0) {
    return null;
  }

  // To make the ticker loop seamlessly, we duplicate the news items.
  const tickerItems = [...news.items, ...news.items];

  return (
    <TickerContainer>
      <TickerWrapper>
        {tickerItems.map((item, index) => (
          <TickerItem href={item.link} key={`${item.link}-${index}`} target="_blank" rel="noopener noreferrer">
            <strong>[NEWS]</strong> {item.title}
          </TickerItem>
        ))}
      </TickerWrapper>
    </TickerContainer>
  );
};

export default TickerBar;
