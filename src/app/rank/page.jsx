"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from "@/lib/supabaseClient";

export default function RankPage() {
  const [games, setGames] = useState([]);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [availableMonths, setAvailableMonths] = useState([]);

  useEffect(() => {
    // 현재 월을 기본값으로 설정
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(currentMonth);
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      loadFromSupabase();
    }
  }, [selectedMonth]);

  async function loadFromSupabase() {
    try {
      // 선택된 월의 게임만 불러오기
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('month', selectedMonth)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setGames(data || []);
      
      // 사용 가능한 월 목록 가져오기
      const { data: allGames } = await supabase.from('games').select('month');
      if (allGames) {
        const months = [...new Set(allGames.map(g => g.month).filter(Boolean))];
        months.sort().reverse(); // 최신 월부터
        setAvailableMonths(months);
      }
    } catch (e) {
      console.error(e);
      setError('Supabase에서 데이터를 불러오는 중 오류가 발생했습니다.');
    }
  }

  function aggregatePlayers(gamesArray) {
    const players = Object.create(null);
    gamesArray.forEach(game => {
      if (!game || !Array.isArray(game.players)) return;
      
      // 게임의 시작점 설정 추출
      const startPoint = game.startPoint || 25000;

      // 각 플레이어의 최종 점수 계산
      const scores = game.players
        .map((p, idx) => ({
          index: idx,
          name: (p && typeof p.name === 'string' && p.name.trim() !== '') ? p.name.trim() : '무명',
          raw: Number(p && p.score) || 0
        }))
        .sort((a, b) => b.raw - a.raw);

      // 우마: 1위 +15, 2위 +5, 3위 -5, 4위 -15
      // U = (S - startPoint) / 1000 + 우마값
      const umaByRank = [15, 5, -5, -15];
      const finalScores = scores.map((p, rank) => {
        const baseScore = (p.raw - startPoint) / 1000;
        const umaPoint = umaByRank[rank];
        const final = baseScore + umaPoint;
        return {
          ...p,
          baseScore: baseScore,
          umaPoint: umaPoint,
          final: final
        };
      });

      finalScores.forEach(p => {
        if (!players[p.name]) players[p.name] = { total: 0, games: 0 };
        players[p.name].total += p.final;
        players[p.name].games += 1;
      });
    });

    const arr = Object.keys(players).map(name => ({
      name,
      total: players[name].total,
      games: players[name].games,
      avg: players[name].games ? players[name].total / players[name].games : 0
    }));
    arr.sort((a, b) => b.total - a.total);

    let lastScore = null; let lastRank = 0; let count = 0;
    arr.forEach(item => {
      count += 1;
      if (lastScore === item.total) {
        item.rank = lastRank;
      } else {
        item.rank = count;
        lastRank = item.rank;
        lastScore = item.total;
      }
    });
    return arr;
  }

  const handleFile = (evt) => {
    setError('');
    const file = evt.target.files && evt.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed && Array.isArray(parsed.games)) {
          // parsed likely matches exported structure: { games: [...] }
          setGames(parsed.games);
        } else if (Array.isArray(parsed)) {
          setGames(parsed);
        } else {
          setError('파일 형식이 올바르지 않습니다. games 배열 또는 게임 배열을 포함해야 합니다.');
        }
      } catch (err) {
        console.error(err);
        setError('파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.onerror = () => setError('파일을 읽는 중 오류가 발생했습니다.');
    reader.readAsText(file);
  };

  const deleteGame = async (index) => {
    const gameToDelete = games[index];
    if (window.confirm(`게임 "${gameToDelete.game_name || `게임 ${index + 1}`}"을(를) 삭제하시겠습니까?`)) {
      try {
        // Supabase에서 삭제
        const { error } = await supabase.from('games').delete().eq('id', gameToDelete.id);
        if (error) throw error;
        
        // 로컬 state 업데이트
        const newGames = games.filter((_, i) => i !== index);
        setGames(newGames);
        alert('삭제되었습니다.');
      } catch (e) {
        console.error(e);
        alert('삭제 중 오류가 발생했습니다: ' + e.message);
      }
    }
  };

  const rows = aggregatePlayers(games);

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ textAlign: 'center' }}>마X방 마X왕 순위</h1>
      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <label style={{ marginRight: 8, fontWeight: 'bold' }}>월 선택:</label>
        <select 
          value={selectedMonth} 
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          {availableMonths.map(month => (
            <option key={month} value={month}>{month}</option>
          ))}
        </select>
      </div>
      <p style={{ textAlign: 'center', marginTop: 8 }} className="small">총 게임 수: {games.length}</p>
      <div style={{ margin: '14px 0', textAlign: 'center' }}>
        <div style={{ marginTop: 8 }}>
          <button onClick={loadFromSupabase} style={{ marginRight: 8 }}>새로고침</button>
          <Link href="/mahjong"><button>입력 페이지로 이동</button></Link>
        </div>
        {error && <div style={{ color: '#b00020', marginTop: 8 }}>{error}</div>}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: 8 }}>순위</th>
            <th style={{ border: '1px solid #ddd', padding: 8 }}>플레이어</th>
            <th style={{ border: '1px solid #ddd', padding: 8 }}>총 점수</th>
            <th style={{ border: '1px solid #ddd', padding: 8 }}>참여 게임 수</th>
            <th style={{ border: '1px solid #ddd', padding: 8 }}>평균</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={5} style={{ textAlign: 'center', padding: 12 }}>데이터 없음</td></tr>
          ) : rows.map(r => (
            <tr key={r.name}>
              <td style={{ border: '1px solid #ddd', padding: 8 }}>{r.rank}</td>
              <td style={{ border: '1px solid #ddd', padding: 8 }}>{r.name}</td>
              <td style={{ border: '1px solid #ddd', padding: 8 }}>{r.total}</td>
              <td style={{ border: '1px solid #ddd', padding: 8 }}>{r.games}</td>
              <td style={{ border: '1px solid #ddd', padding: 8 }}>{r.avg.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: 32, marginBottom: 16 }}>대국 목록</h2>
      {games.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#999' }}>저장된 대국이 없습니다.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {games.map((game, idx) => (
            <div key={idx} style={{ border: '1px solid #ddd', padding: 12, borderRadius: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{game.game_name || `게임 ${idx + 1}`}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {game.players && game.players.map(p => `${p.name}: ${p.score}점`).join(' / ')}
                </div>
                <div style={{ fontSize: '11px', color: '#999', marginTop: 4 }}>
                  {new Date(game.created_at).toLocaleString()}
                </div>
              </div>
              <button 
                onClick={() => deleteGame(idx)}
                style={{ padding: '6px 12px', background: '#ff5252', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
