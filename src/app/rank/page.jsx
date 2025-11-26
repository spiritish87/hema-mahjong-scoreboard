"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function RankPage() {
  const [games, setGames] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    // check monthly reset first, then load
    checkMonthlyResetThenLoad();

    // listen for storage events (other tabs) and custom events (same tab)
    const onStorage = (e) => {
      if (!e) return;
      if (e.key === 'mahjong_games' || e.key === 'mahjong_games_updated_at' || e.key === 'mahjong_rank_last_reset') {
        loadFromLocalStorage();
      }
    };
    const onCustom = () => loadFromLocalStorage();
    window.addEventListener('storage', onStorage);
    window.addEventListener('mahjong_games_updated', onCustom);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('mahjong_games_updated', onCustom);
    };
  }, []);

  // Monthly reset: if stored last reset month differs from current year-month, clear games
  function checkMonthlyResetThenLoad() {
    try {
      const now = new Date();
      const ym = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
      const last = localStorage.getItem('mahjong_rank_last_reset');
      if (last !== ym) {
        // Archive existing games before resetting
        try {
          const raw = localStorage.getItem('mahjong_games');
          const arr = raw ? JSON.parse(raw) : [];
          if (Array.isArray(arr) && arr.length > 0) {
            // archive year-month should refer to the period being archived (previous month)
            const archiveYm = last || (() => {
              const prev = new Date(now.getFullYear(), now.getMonth(), 0); // last day of previous month
              return `${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,'0')}`;
            })();

            const archiveKey = `mahjong_games_archive_${archiveYm}`;
            // store archive in localStorage under archive key
            localStorage.setItem(archiveKey, JSON.stringify(arr));

            // trigger a download of the archive JSON so user has a file copy
            try {
              const blob = new Blob([JSON.stringify({ games: arr }, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `mahjong_games_archive_${archiveYm}.json`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            } catch (dlErr) {
              console.warn('archive download failed', dlErr);
            }
          }
        } catch (archErr) {
          console.error('archive failed', archErr);
        }

        // reset mahjong_games and record the reset month
        localStorage.setItem('mahjong_games', JSON.stringify([]));
        localStorage.setItem('mahjong_rank_last_reset', ym);
        // notify listeners
        localStorage.setItem('mahjong_games_updated_at', String(Date.now()));
        try { window.dispatchEvent(new CustomEvent('mahjong_games_updated')); } catch (e) { /* no-op */ }
      }
    } catch (e) {
      console.error('monthly reset check failed', e);
    }
    loadFromLocalStorage();
  }

  function loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem('mahjong_games');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setGames(parsed);
          return;
        }
      }
      // fallback to single entry
      const single = localStorage.getItem('mahjong_game_entry');
      if (single) {
        const p = JSON.parse(single);
        setGames([p]);
        return;
      }
      setGames([]);
    } catch (e) {
      console.error(e);
      setError('데이터 로드 중 오류가 발생했습니다. 파일을 가져와 보세요.');
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

  const deleteGame = (index) => {
    if (window.confirm(`게임 "${games[index].gameName || `게임 ${index + 1}`}"을(를) 삭제하시겠습니까?`)) {
      const newGames = games.filter((_, i) => i !== index);
      setGames(newGames);
      localStorage.setItem('mahjong_games', JSON.stringify(newGames));
      localStorage.setItem('mahjong_games_updated_at', String(Date.now()));
      try { window.dispatchEvent(new CustomEvent('mahjong_games_updated')); } catch (e) { /* no-op */ }
    }
  };

  const rows = aggregatePlayers(games);

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ textAlign: 'center' }}>리그전 총합 등수표</h1>
      <p style={{ textAlign: 'center', marginTop: 8 }} className="small">총 게임 수: {games.length}</p>
      <div style={{ margin: '14px 0', textAlign: 'center' }}>
        <input type="file" accept="application/json" onChange={handleFile} />
        <div style={{ marginTop: 8 }}>
          <button onClick={loadFromLocalStorage} style={{ marginRight: 8 }}>로컬스토리지에서 재로드</button>
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
                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{game.gameName || `게임 ${idx + 1}`}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {game.players && game.players.map(p => `${p.name}: ${p.score}점`).join(' / ')}
                </div>
                <div style={{ fontSize: '11px', color: '#999', marginTop: 4 }}>
                  {new Date(game.savedAt).toLocaleString()}
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
