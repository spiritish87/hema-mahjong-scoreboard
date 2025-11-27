"use client";
import { useState, useEffect } from "react";
import Link from 'next/link';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";

// 최종 점수 계산 (4명 기준, 순위별 우마 적용)
// U = (S - startPoint) / 1000 + 우마값
function calculateAllScores(players, startPoint) {
  const validScores = players
    .map((p, idx) => ({
      index: idx,
      name: p.name || `플레이어${idx + 1}`,
      raw: Number(p.score) || 0
    }))
    .sort((a, b) => b.raw - a.raw); // 내림차순 정렬 (1위부터)

  // 우마 적용: 1위 +15, 2위 +5, 3위 -5, 4위 -15
  const umaByRank = [15, 5, -5, -15];
  const finalScores = validScores.map((p, rank) => {
    const baseScore = (p.raw - startPoint) / 1000;
    const umaPoint = umaByRank[rank];
    const final = baseScore + umaPoint;
    return {
      index: p.index,
      name: p.name,
      raw: p.raw,
      baseScore: baseScore,
      umaPoint: umaPoint,
      final: final
    };
  });

  return finalScores;
}

export default function MahjongScoreEntry() {
  const [gameName, setGameName] = useState("");
  const [players, setPlayers] = useState([
    { name: "", score: "" },
    { name: "", score: "" },
    { name: "", score: "" },
    { name: "", score: "" }
  ]);
  const [startPoint, setStartPoint] = useState(25000);
  const [calculatedScores, setCalculatedScores] = useState(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("mahjong_game_entry");
    if (saved) {
      const parsed = JSON.parse(saved);
      setGameName(parsed.gameName || "");
      setPlayers(parsed.players || players);
      setStartPoint(parsed.startPoint || 25000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updatePlayer = (index, field, value) => {
    const newPlayers = [...players];
    newPlayers[index][field] = value;
    setPlayers(newPlayers);
    // 자동으로 점수 계산 업데이트
    const scores = calculateAllScores(newPlayers, startPoint);
    setCalculatedScores(scores);
  };

  const saveData = async () => {
    // 점수 유효성 검사
    const validPlayers = players.filter(p => p.name && p.score);
    if (validPlayers.length === 0) {
      alert('최소 1명 이상의 플레이어 정보를 입력해주세요.');
      return;
    }

    // 점수 순서 검증 (높은 점수가 더 높은 순위여야 함)
    const sortedByScore = [...players]
      .filter(p => p.score !== '' && p.score !== null && p.score !== undefined)
      .map(p => ({ name: p.name, score: Number(p.score) }))
      .sort((a, b) => b.score - a.score);

    // 입력된 순서대로 점수 확인
    const inputScores = players
      .filter(p => p.score !== '' && p.score !== null && p.score !== undefined)
      .map(p => Number(p.score));

    for (let i = 0; i < inputScores.length - 1; i++) {
      if (inputScores[i] < inputScores[i + 1]) {
        alert('잘못된 값을 입력하셨습니다 (점수와 순위 확인)\n위쪽 플레이어의 점수가 더 높아야 합니다.');
        return;
      }
    }

    // 현재 월 자동 설정 (YYYY-MM 형식)
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const entry = { game_name: gameName, players, month: currentMonth };
    console.log('저장 요청:', entry);
    try {
      const { data, error, status } = await supabase.from('games').insert([entry]);
      console.log('Supabase 응답:', { data, error, status });
      if (error) {
        alert("저장 중 오류가 발생했습니다: " + error.message);
        throw error;
      }
      alert("게임이 저장되었습니다.");
      // 입력 필드 초기화
      setPlayers([{ name: "", score: "" }, { name: "", score: "" }, { name: "", score: "" }, { name: "", score: "" }]);
      setCalculatedScores(null);
    } catch (e) {
      console.error(e);
      alert("저장 중 오류가 발생했습니다. 콘솔을 확인하세요.");
    }
  };

  const exportAll = () => {
    try {
      const raw = localStorage.getItem("mahjong_games") || "[]";
      const blob = new Blob([raw], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mahjong_games_${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("내보내기 중 오류가 발생했습니다.");
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '16px', background: '#1a2332', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
      <div style={{ width: '100%', maxWidth: '800px', background: '#243447', border: '2px solid #d4af37', borderRadius: '16px', padding: '16px', boxShadow: '0 4px 20px rgba(212, 175, 55, 0.3)' }}>
        <h1 style={{ fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center', color: '#d4af37', fontFamily: '"Song Myung", Gungsuh, GungsuhChe, 궁서체, serif' }}>마X방 점수 기입</h1>

        <button 
          onClick={() => setShowGuide(!showGuide)}
          style={{ marginBottom: '12px', padding: '8px 16px', background: '#2d4159', border: '2px solid #d4af37', borderRadius: '6px', cursor: 'pointer', color: '#d4af37', fontWeight: 'bold' }}
        >
          {showGuide ? '계산 규칙 숨기기' : '계산 규칙 보기'}
        </button>
          
        {showGuide && (
          <div style={{ background: '#1a2332', padding: '16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', lineHeight: '1.8', border: '2px solid #d4af37', color: '#d4af37' }}>
            <strong style={{ fontSize: '14px' }}>마작 점수 계산 규칙:</strong><br/>
            최종표기: (대전결과 - 25000) / 1000 + 우마점수<br/>
            우마: 1위 +15, 2위 +5, 3위 -5, 4위 -15<br/>
            예: 31400점 1위 = (31400-25000)/1000+15 = 6.4+15 = 21.4
          </div>
        )}        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {players.map((p, i) => (
            <div key={i} style={{ padding: '12px', borderRadius: '12px', background: '#1a2332', border: '2px solid #d4af37' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input
                  placeholder={`플레이어 ${i + 1} 이름`}
                  value={p.name}
                  onChange={(e) => updatePlayer(i, "name", e.target.value)}
                  style={{ padding: '10px', borderRadius: '6px', border: '2px solid #d4af37', background: '#2d4159', color: '#d4af37', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
                  lang="ko"
                  autoComplete="off"
                />
                <input
                  placeholder="점수"
                  value={p.score}
                  onChange={(e) => updatePlayer(i, "score", e.target.value)}
                  type="number"
                  step="100"
                  style={{ padding: '10px', borderRadius: '6px', border: '2px solid #d4af37', background: '#2d4159', color: '#d4af37', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              {calculatedScores && calculatedScores[i] && (
                <div style={{ marginTop: '12px', fontSize: '13px', color: '#d4af37', padding: '10px', background: '#243447', borderRadius: '6px', border: '1px solid #d4af37' }}>
                  <div>기본: {calculatedScores[i].baseScore.toFixed(1)}</div>
                  <div>우마: {calculatedScores[i].umaPoint > 0 ? '+' : ''}{calculatedScores[i].umaPoint}</div>
                  <div style={{ fontWeight: 'bold', color: calculatedScores[i].final >= 0 ? '#ffd700' : '#ff6b6b', marginTop: '6px', fontSize: '14px' }}>점수: {calculatedScores[i].final.toFixed(1)}</div>
                </div>
              )}
            </div>
          ))}
        </div>

        <button 
          onClick={saveData} 
          style={{ width: '100%', marginTop: '24px', padding: '16px', fontSize: '18px', fontWeight: 'bold', borderRadius: '12px', background: '#2d4159', border: '3px solid #d4af37', color: '#d4af37', cursor: 'pointer', boxShadow: '0 2px 10px rgba(212, 175, 55, 0.3)' }}
        >
          저장하기
        </button>

        <Link href="/rank" style={{ display: 'block', marginTop: '16px' }}>
          <button style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 'bold', borderRadius: '8px', background: '#1a2332', border: '2px solid #d4af37', color: '#d4af37', cursor: 'pointer' }}>
            등수 대시보드 보기
          </button>
        </Link>
      </div>
    </div>
  );
}
