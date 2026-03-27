import { useState, useEffect } from "react";
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import Icon from "../components/ui/Icon";
import { CATEGORIES } from "../constants";

const RankingTable = () => {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [tools, setTools] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: "Rank", direction: "asc" });
  const [filterCategory, setFilterCategory] = useState("all");

  useEffect(() => {
    fetchLatestRanking();
  }, []);

  const fetchLatestRanking = async () => {
    try {
      setLoading(true);

      // 1. adminReports에서 최신 랭킹 데이터 가져오기 시도
      const q = query(
        collection(db, "adminReports"),
        where("type", "==", "ranking_update")
      );

      const snapshot = await getDocs(q);
      console.log("📊 adminReports 문서 개수:", snapshot.size);

      if (!snapshot.empty) {
        // createdAt 기준으로 클라이언트 측 정렬하여 최신 문서 찾기
        const docs = snapshot.docs.sort((a, b) => {
          const aTime = a.data().createdAt?.toMillis() || 0;
          const bTime = b.data().createdAt?.toMillis() || 0;
          return bTime - aTime; // 내림차순
        });

        const doc = docs[0];
        const data = doc.data();
        console.log("✅ 최신 adminReport 선택:", data.createdAt?.toDate());
        setReportData(data);
        setTools(data.data?.tools || []);
        console.log("✅ adminReports에서 데이터 로드:", data.data?.tools?.length || 0);
      } else {
        // 2. adminReports에 데이터가 없으면 tools 컬렉션에서 직접 가져오기
        console.log("⚠️ adminReports에 데이터 없음. tools 컬렉션에서 가져오는 중...");
        const toolsQuery = query(
          collection(db, "tools"),
          limit(100)
        );

        const toolsSnapshot = await getDocs(toolsQuery);
        console.log("📊 tools 컬렉션 문서 개수:", toolsSnapshot.size);

        const toolsData = toolsSnapshot.docs.map((doc, idx) => {
          const data = doc.data();
          console.log(`툴 ${idx + 1}:`, data.name, "rank:", data.rank, "score:", data.score);
          return {
            Rank: data.rank || idx + 1,
            Change: "—",
            Name: data.name || "Unknown",
            URL: data.url || "",
            Category: data.cat || "etc",
            Tags: data.tags || [],
            Description: data.desc || "",
            One_Line_Review: data.oneLineReview || "",
            USP: data.usp || "",
            Pros_Cons: data.prosCons || { pros: [], cons: [] },
            Difficulty: data.difficulty || "중급",
            Usage_Score: data.metrics?.usage || 0,
            Tech_Score: data.metrics?.tech || 0,
            Buzz_Score: data.metrics?.buzz || 0,
            Utility_Score: data.metrics?.utility || 0,
            Growth_Score: data.metrics?.growth || 0,
            Total_Score: data.score || 0,
            Pricing: data.pricing || "—",
            Korean_Support: data.koSupport || "N",
            Platform: data.platform || ["Web"],
            API_Available: data.apiAvailable || "N"
          };
        });

        // 클라이언트 측에서 rank 기준으로 정렬
        toolsData.sort((a, b) => a.Rank - b.Rank);
        console.log("✅ 최종 데이터:", toolsData.length, "개");

        setTools(toolsData);
        setReportData({
          data: {
            weekLabel: "현재 랭킹",
            generatedAt: new Date().toISOString(),
            totalCount: toolsData.length,
            engine: "Firestore tools 컬렉션"
          }
        });
        console.log("✅ tools 컬렉션에서 데이터 로드 완료:", toolsData.length);
      }
    } catch (error) {
      console.error("❌ 랭킹 데이터 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    const direction =
      sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc";
    setSortConfig({ key, direction });

    const sorted = [...tools].sort((a, b) => {
      const aVal = a[key] ?? 0;
      const bVal = b[key] ?? 0;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      return direction === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    setTools(sorted);
  };

  const filteredTools = filterCategory === "all"
    ? tools
    : tools.filter((t) => t.Category === filterCategory);

  const categories = ["all", ...new Set(tools.map((t) => t.Category))];

  const formatDateRange = (isoString) => {
    if (!isoString) return "3.16~3.22";
    const date = new Date(isoString);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    return `${weekStart.getMonth() + 1}.${weekStart.getDate()}~${weekEnd.getMonth() + 1}.${weekEnd.getDate()}`;
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return "2026.03.22 03:10 KST";
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return `${year}.${month}.${day} ${hour}:${minute} KST`;
  };

  const calculateAvg = (toolsList) => {
    if (!toolsList || toolsList.length === 0) return "0.0";
    const sum = toolsList.reduce((acc, t) => acc + (t.Total_Score || 0), 0);
    return (sum / toolsList.length).toFixed(2);
  };

  const getCategoryLabel = (catId) => {
    const cat = CATEGORIES.find((c) => c.id === catId);
    return cat?.label || catId;
  };

  const getChangeIcon = (change) => {
    if (!change || change === "0" || change === "-" || change === "—") return "—";
    if (change === "NEW") {
      return (
        <span style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          padding: "4px 10px",
          borderRadius: "6px",
          fontSize: "0.75rem",
          fontWeight: 700,
          letterSpacing: "0.5px",
          display: "inline-block",
          boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)"
        }}>
          NEW
        </span>
      );
    }
    const num = parseInt(change);
    if (num > 0) return `▲${num}`;
    if (num < 0) return `▼${Math.abs(num)}`;
    return "—";
  };

  const formatPricing = (pricing) => {
    if (!pricing || pricing === "—") return "—";
    // "Freemium" -> "Free / $20 / $30 / $40" 형식으로 변환
    // 실제 데이터에 가격 정보가 없으면 간단히 표시
    if (pricing.toLowerCase().includes("free")) return "Free";
    if (pricing.toLowerCase().includes("paid")) return "Paid";
    return pricing;
  };

  if (loading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        fontSize: "0.95rem",
        color: "var(--text-secondary)"
      }}>
        <div style={{ textAlign: "center" }}>
          <Icon name="spinner" size={32} style={{ marginBottom: "12px" }} />
          <p>랭킹 데이터 로딩중…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: "1400px",
      margin: "0 auto",
      padding: "32px 20px"
    }}>
      {/* 헤더 */}
      <header style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "24px",
        flexWrap: "wrap",
        gap: "12px"
      }}>
        <h1 style={{
          fontSize: "1.75rem",
          fontWeight: 700,
          color: "var(--text-primary)",
          margin: 0
        }}>
          랭킹 세부 데이터
        </h1>
        <div style={{
          fontSize: "0.9rem",
          color: "var(--text-secondary)",
          display: "flex",
          alignItems: "center",
          gap: "6px"
        }}>
          <Icon name="calendar" size={16} />
          <span>
            {reportData?.data?.weekLabel || "2026년 3월 3주차"} (
            {formatDateRange(reportData?.data?.generatedAt)})
          </span>
        </div>
      </header>

      {/* 필터 바 */}
      <div style={{
        display: "flex",
        gap: "12px",
        marginBottom: "20px",
        flexWrap: "wrap"
      }}>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: "var(--r-md)",
            border: "1px solid var(--border-primary)",
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            fontSize: "0.85rem",
            cursor: "pointer"
          }}
          aria-label="카테고리 필터"
        >
          <option value="all">전체 카테고리</option>
          {categories.filter(c => c !== "all").map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* 테이블 */}
      <div style={{ overflowX: "auto" }}>
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "0.85rem",
          background: "var(--bg-card)",
          borderRadius: "var(--r-md)",
          overflow: "hidden",
          border: "1px solid var(--border-primary)"
        }}>
          <thead>
            <tr style={{ background: "var(--bg-tertiary)" }}>
              <SortableHeader label="순위" sortKey="Rank" sortConfig={sortConfig} onSort={handleSort} />
              <th style={thStyle}>변동</th>
              <th style={thStyle}>툴명</th>
              <th style={thStyle}>카테고리</th>
              <th style={thStyle}>주요 태그</th>
              <SortableHeader label="종합" sortKey="Total_Score" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="사용량" sortKey="Usage_Score" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="기술력" sortKey="Tech_Score" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="화제성" sortKey="Buzz_Score" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="실용성" sortKey="Utility_Score" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="성장성" sortKey="Growth_Score" sortConfig={sortConfig} onSort={handleSort} />
              <th style={thStyle}>가격</th>
              <th style={thStyle}>한국어</th>
            </tr>
          </thead>
          <tbody>
            {filteredTools.map((tool, idx) => (
              <tr
                key={idx}
                style={{
                  borderTop: "1px solid var(--border-primary)",
                  transition: "background 0.2s ease"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-tertiary)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <td style={tdStyle}>{tool.Rank || idx + 1}</td>
                <td style={tdStyle}>{getChangeIcon(tool.Change)}</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <img
                      src={tool.Logo || `https://www.google.com/s2/favicons?domain=${tool.URL}&sz=64`}
                      alt={`${tool.Name} logo`}
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "4px",
                        objectFit: "cover",
                        flexShrink: 0
                      }}
                      onError={(e) => {
                        e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%23ddd'/%3E%3Ctext x='12' y='16' text-anchor='middle' font-size='12' fill='%23999'%3E?%3C/text%3E%3C/svg%3E";
                      }}
                    />
                    <a
                      href={tool.URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "var(--accent-indigo)",
                        textDecoration: "none"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                      onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
                    >
                      {tool.Name}
                    </a>
                  </div>
                </td>
                <td style={tdStyle}>
                  <span style={{
                    padding: "2px 8px",
                    borderRadius: "4px",
                    background: "var(--bg-tertiary)",
                    fontSize: "0.75rem"
                  }}>
                    {getCategoryLabel(tool.Category)}
                  </span>
                </td>
                <td style={{ ...tdStyle, fontSize: "0.75rem" }}>
                  {tool.Tags && tool.Tags.length > 0 ? (
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      {tool.Tags.slice(0, 2).map((tag, i) => (
                        <span key={i} style={{
                          padding: "2px 6px",
                          borderRadius: "3px",
                          background: "var(--bg-secondary)",
                          color: "var(--text-muted)",
                          fontSize: "0.7rem"
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : "—"}
                </td>
                <td style={{ ...tdStyle, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  {tool.Total_Score?.toFixed(1) || "—"}
                </td>
                <td style={{ ...tdStyle, fontVariantNumeric: "tabular-nums" }}>
                  {tool.Usage_Score?.toFixed(1) || "—"}
                </td>
                <td style={{ ...tdStyle, fontVariantNumeric: "tabular-nums" }}>
                  {tool.Tech_Score?.toFixed(1) || "—"}
                </td>
                <td style={{ ...tdStyle, fontVariantNumeric: "tabular-nums" }}>
                  {tool.Buzz_Score?.toFixed(1) || "—"}
                </td>
                <td style={{ ...tdStyle, fontVariantNumeric: "tabular-nums" }}>
                  {tool.Utility_Score?.toFixed(1) || "—"}
                </td>
                <td style={{ ...tdStyle, fontVariantNumeric: "tabular-nums" }}>
                  {tool.Growth_Score?.toFixed(1) || "—"}
                </td>
                <td style={tdStyle}>{formatPricing(tool.Pricing)}</td>
                <td style={tdStyle}>{tool.Korean_Support === "Y" ? "✓" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 푸터 */}
      <footer style={{
        marginTop: "20px",
        padding: "16px",
        fontSize: "0.85rem",
        color: "var(--text-muted)",
        background: "var(--bg-card)",
        borderRadius: "var(--r-md)",
        border: "1px solid var(--border-primary)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px"
      }}>
        <div>
          💡 총 {reportData?.data?.totalCount || filteredTools.length}개 툴 |
          평균 점수: {calculateAvg(tools)} |
          엔진: {reportData?.data?.engine || "Gemini 3 Flash Preview"}
        </div>
        <div>
          업데이트: <time dateTime={reportData?.data?.generatedAt}>
            {formatDateTime(reportData?.data?.generatedAt)}
          </time>
        </div>
      </footer>
    </div>
  );
};

// 정렬 가능한 헤더 컴포넌트
const SortableHeader = ({ label, sortKey, sortConfig, onSort }) => {
  const isActive = sortConfig.key === sortKey;
  const direction = isActive ? sortConfig.direction : null;

  return (
    <th style={thStyle}>
      <button
        onClick={() => onSort(sortKey)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSort(sortKey);
          }
        }}
        aria-label={`${label} 기준으로 정렬`}
        style={{
          background: "none",
          border: "none",
          color: "var(--text-primary)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          fontWeight: 600,
          padding: 0,
          fontFamily: "inherit",
          fontSize: "inherit"
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent-indigo)"}
        onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-primary)"}
      >
        {label}
        <span style={{ fontSize: "10px", opacity: isActive ? 1 : 0.3 }}>
          {direction === "asc" ? "▲" : "▼"}
        </span>
      </button>
    </th>
  );
};

const thStyle = {
  padding: "12px 16px",
  textAlign: "left",
  fontWeight: 600,
  color: "var(--text-primary)",
  fontSize: "0.8rem",
  whiteSpace: "nowrap"
};

const tdStyle = {
  padding: "12px 16px",
  color: "var(--text-secondary)",
  whiteSpace: "nowrap"
};

export default RankingTable;
