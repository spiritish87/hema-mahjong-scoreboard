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
          rank: rank + 1, // 1위=1, 2위=2, 3위=3, 4위=4
          baseScore: baseScore,
          umaPoint: umaPoint,
          final: final
        };
      });

      finalScores.forEach(p => {
        if (!players[p.name]) {
          players[p.name] = { 
            total: 0, 
            games: 0,
            rank1: 0,
            rank2: 0,
            rank3: 0,
            rank4: 0
          };
        }
        players[p.name].total += p.final;
        players[p.name].games += 1;
        
        // 순위별 카운트
        if (p.rank === 1) players[p.name].rank1 += 1;
        else if (p.rank === 2) players[p.name].rank2 += 1;
        else if (p.rank === 3) players[p.name].rank3 += 1;
        else if (p.rank === 4) players[p.name].rank4 += 1;
      });
    });

    const arr = Object.keys(players).map(name => {
      const p = players[name];
      return {
        name,
        total: p.total,
        games: p.games,
        avg: p.games ? p.total / p.games : 0,
        rank1Rate: p.games ? (p.rank1 / p.games * 100).toFixed(1) : '0.0',
        rank2Rate: p.games ? (p.rank2 / p.games * 100).toFixed(1) : '0.0',
        rank3Rate: p.games ? (p.rank3 / p.games * 100).toFixed(1) : '0.0',
        rank4Rate: p.games ? (p.rank4 / p.games * 100).toFixed(1) : '0.0',
      };
    });
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
    <main style={{ padding: '16px', minHeight: '100vh', background: '#1a2332' }}>
      <h1 style={{ textAlign: 'center', color: '#d4af37', fontSize: 'clamp(22px, 6vw, 32px)', fontWeight: 'bold', marginBottom: '16px', fontFamily: 'Gungsuh, GungsuhChe, 궁서체, serif' }}>마X방 마X왕 순위</h1>
      <div style={{ textAlign: 'center', marginTop: 12, marginBottom: 12 }}>
        <label style={{ marginRight: 8, fontWeight: 'bold', color: '#d4af37', fontSize: '14px' }}>월 선택:</label>
        <select 
          value={selectedMonth} 
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '2px solid #d4af37', background: '#2d4159', color: '#d4af37', fontSize: '14px', fontWeight: 'bold' }}
        >
          {availableMonths.map(month => (
            <option key={month} value={month}>{month}</option>
          ))}
        </select>
      </div>
      <p style={{ textAlign: 'center', marginTop: 8, color: '#d4af37', fontSize: '14px' }}>총 게임 수: {games.length}</p>
      <div style={{ margin: '14px 0', textAlign: 'center', display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
        <button onClick={loadFromSupabase} style={{ padding: '8px 16px', background: '#2d4159', border: '2px solid #d4af37', borderRadius: '6px', color: '#d4af37', fontWeight: 'bold', cursor: 'pointer' }}>새로고침</button>
        <Link href="/mahjong"><button style={{ padding: '8px 16px', background: '#2d4159', border: '2px solid #d4af37', borderRadius: '6px', color: '#d4af37', fontWeight: 'bold', cursor: 'pointer' }}>입력 페이지로 이동</button></Link>
        {error && <div style={{ color: '#ff6b6b', marginTop: 8, width: '100%' }}>{error}</div>}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', background: '#243447', border: '2px solid #d4af37' }}>
        <thead>
          <tr style={{ background: '#2d4159' }}>
            <th style={{ border: '1px solid #d4af37', padding: 12, color: '#d4af37', fontWeight: 'bold' }}>순위</th>
            <th style={{ border: '1px solid #d4af37', padding: 12, color: '#d4af37', fontWeight: 'bold' }}>플레이어</th>
            <th style={{ border: '1px solid #d4af37', padding: 12, color: '#d4af37', fontWeight: 'bold' }}>총 점수</th>
            <th style={{ border: '1px solid #d4af37', padding: 12, color: '#d4af37', fontWeight: 'bold' }}>참여 게임 수</th>
            <th style={{ border: '1px solid #d4af37', padding: 12, color: '#d4af37', fontWeight: 'bold' }}>평균</th>
            <th style={{ border: '1px solid #d4af37', padding: 12, color: '#d4af37', fontWeight: 'bold' }}>1등률</th>
            <th style={{ border: '1px solid #d4af37', padding: 12, color: '#d4af37', fontWeight: 'bold' }}>2등률</th>
            <th style={{ border: '1px solid #d4af37', padding: 12, color: '#d4af37', fontWeight: 'bold' }}>3등률</th>
            <th style={{ border: '1px solid #d4af37', padding: 12, color: '#d4af37', fontWeight: 'bold' }}>4등률</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={9} style={{ textAlign: 'center', padding: 12, color: '#d4af37' }}>데이터 없음</td></tr>
          ) : rows.map(r => (
            <tr key={r.name} style={{ background: '#1a2332' }}>
              <td style={{ border: '1px solid #d4af37', padding: 10, color: '#d4af37' }}>{r.rank}</td>
              <td style={{ border: '1px solid #d4af37', padding: 10, color: '#d4af37', fontWeight: 'bold' }}>{r.name}</td>
              <td style={{ border: '1px solid #d4af37', padding: 10, color: '#ffd700', fontWeight: 'bold' }}>{r.total.toFixed(1)}</td>
              <td style={{ border: '1px solid #d4af37', padding: 10, color: '#d4af37' }}>{r.games}</td>
              <td style={{ border: '1px solid #d4af37', padding: 10, color: '#d4af37' }}>{r.avg.toFixed(1)}</td>
              <td style={{ border: '1px solid #d4af37', padding: 10, color: '#d4af37' }}>{r.rank1Rate}%</td>
              <td style={{ border: '1px solid #d4af37', padding: 10, color: '#d4af37' }}>{r.rank2Rate}%</td>
              <td style={{ border: '1px solid #d4af37', padding: 10, color: '#d4af37' }}>{r.rank3Rate}%</td>
              <td style={{ border: '1px solid #d4af37', padding: 10, color: '#d4af37' }}>{r.rank4Rate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <h2 style={{ marginTop: 32, marginBottom: 16, color: '#d4af37', fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 'bold', fontFamily: 'Gungsuh, GungsuhChe, 궁서체, serif' }}>대국 목록</h2>
      {games.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#d4af37' }}>저장된 대국이 없습니다.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {games.map((game, idx) => (
            <div key={idx} style={{ border: '2px solid #d4af37', padding: '12px', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: '8px', background: '#243447' }}>
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: 4, color: '#d4af37', fontSize: '15px' }}>{game.game_name || `게임 ${idx + 1}`}</div>
                <div style={{ fontSize: '12px', color: '#d4af37', wordBreak: 'break-word' }}>
                  {game.players && game.players.map(p => `${p.name}: ${p.score}점`).join(' / ')}
                </div>
                <div style={{ fontSize: '11px', color: '#c9a961', marginTop: 4 }}>
                  {new Date(game.created_at).toLocaleString()}
                </div>
              </div>
              <button 
                onClick={() => deleteGame(idx)}
                style={{ padding: '8px 16px', background: '#8b0000', color: '#ffd700', border: '2px solid #d4af37', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold', alignSelf: 'flex-end' }}
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
