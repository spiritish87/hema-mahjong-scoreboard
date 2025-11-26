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
    const entry = { game_name: gameName, players };
    console.log('저장 요청:', entry);
    try {
      const { data, error, status } = await supabase.from('games').insert([entry]);
      console.log('Supabase 응답:', { data, error, status });
      if (error) {
        alert("저장 중 오류가 발생했습니다: " + error.message);
        throw error;
      }
      alert("게임이 저장되었습니다. 응답: " + JSON.stringify(data));
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
    <div className="min-h-screen p-6 bg-gray-100 flex justify-center items-start">
      <Card className="w-full max-w-2xl shadow-xl rounded-2xl p-4">
        <CardContent>
          <h1 className="text-2xl font-semibold mb-4 text-center">작혼 리그전 점수 입력</h1>

          <button 
            onClick={() => setShowGuide(!showGuide)}
            style={{ marginBottom: '12px', padding: '6px 12px', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
          >
            {showGuide ? '계산 규칙 숨기기' : '계산 규칙 보기'}
          </button>
          
          {showGuide && (
            <div style={{ background: '#f9f9f9', padding: '12px', borderRadius: '4px', marginBottom: '12px', fontSize: '12px', lineHeight: '1.6', border: '1px solid #e0e0e0' }}>
              <strong>마작 점수 계산 규칙:</strong><br/>
              1. 기본점 S: 최종점수<br/>
              2. 기본 계산: (S - 시작점) / 1000<br/>
              3. 우마 U: 1위 +15, 2위 +5, 3위 -5, 4위 -15<br/>
              4. 최종점수: (S - 시작점) / 1000 + 우마<br/>
              예: 31400점 1위 = (31400-25000)/1000+15 = 6.4+15 = 21.4
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {players.map((p, i) => (
              <Card key={i} className="p-3 rounded-xl shadow-sm">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder={`플레이어 ${i + 1} 이름`}
                    value={p.name}
                    onChange={(e) => updatePlayer(i, "name", e.target.value)}
                  />
                  <Input
                    placeholder="점수"
                    value={p.score}
                    onChange={(e) => updatePlayer(i, "score", e.target.value)}
                    type="number"
                    step="100"
                  />
                </div>
                {calculatedScores && calculatedScores[i] && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#555', padding: '6px', background: '#f5f5f5', borderRadius: '4px' }}>
                    <div>기본: {calculatedScores[i].baseScore.toFixed(1)}</div>
                    <div>우마: {calculatedScores[i].umaPoint > 0 ? '+' : ''}{calculatedScores[i].umaPoint}</div>
                    <div style={{ fontWeight: 'bold', color: calculatedScores[i].final >= 0 ? '#00aa00' : '#aa0000', marginTop: '4px' }}>점수: {calculatedScores[i].final.toFixed(1)}</div>
                  </div>
                )}
              </Card>
            ))}
          </div>

          <Button onClick={saveData} className="w-full mt-6 text-lg p-6 rounded-2xl">
            저장하기
          </Button>

          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <Button onClick={exportAll} className="w-full text-sm p-2">
              전체 내보내기 (JSON)
            </Button>
            <Link href="/rank">
              <Button className="w-full text-sm p-2">등수 대시보드 보기</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
