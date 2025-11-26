import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function MahjongScoreEntry() {
  const [gameName, setGameName] = useState("");
  const [oka, setOka] = useState(30000);
  const [umaTop, setUmaTop] = useState(15);
  const [umaSecond, setUmaSecond] = useState(5);
  const [players, setPlayers] = useState([
    { name: "", score: "" },
    { name: "", score: "" },
    { name: "", score: "" },
    { name: "", score: "" }
  ]);

  useEffect(() => {
    const saved = localStorage.getItem("mahjong_game_entry");
    if (saved) {
      const parsed = JSON.parse(saved);
      setGameName(parsed.gameName || "");
      setPlayers(parsed.players || players);
      setOka(parsed.oka || 30000);
      setUmaTop(parsed.umaTop || 15);
      setUmaSecond(parsed.umaSecond || 5);
    }
  }, []);

  const updatePlayer = (index, field, value) => {
    const newPlayers = [...players];
    newPlayers[index][field] = value;
    setPlayers(newPlayers);
  };

  const saveData = () => {
    localStorage.setItem(
      "mahjong_game_entry",
      JSON.stringify({ gameName, players, oka, umaTop, umaSecond })
    );
  };

  return (
    <div className="min-h-screen p-6 bg-gray-100 flex justify-center items-start">
      <Card className="w-full max-w-2xl shadow-xl rounded-2xl p-4">
        <CardContent>
          <h1 className="text-2xl font-semibold mb-4 text-center">작혼 리그전 점수 입력</h1>

          <div className="mb-4">
            <label className="text-sm">게임 이름</label>
            <Input
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              placeholder="예: 1주차 3게임"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-sm">오카 (기본 30000)</label>
              <Input
                value={oka}
                onChange={(e) => setOka(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-sm">우마 (+15/+5)</label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={umaTop}
                  onChange={(e) => setUmaTop(Number(e.target.value))}
                  placeholder="1위 우마"
                />
                <Input
                  value={umaSecond}
                  onChange={(e) => setUmaSecond(Number(e.target.value))}
                  placeholder="2위 우마"
                />
              </div>
            </div>
          </div>

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
                  />
                </div>
              </Card>
            ))}
          </div>

          <Button onClick={saveData} className="w-full mt-6 text-lg p-6 rounded-2xl">
            저장하기
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
