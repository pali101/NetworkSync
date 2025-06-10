"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import Image from 'next/image';
import XLogo from "../../public/X-logo-black.png";

export default function Home() {
  const [user1, setUser1] = useState("");
  const [user2, setUser2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mutuals, setMutuals] = useState<string[]>([]);

  async function handleFindMutuals() {
    setLoading(true);
    setError("");
    setMutuals([]);

    try {
      const base = process.env.NEXT_PUBLIC_API_BASE;
      const url = `${base}/api/mutual?user1=${user1}&user2=${user2}`;
      console.log(url);
      const res = await fetch(url);
      const data = await res.json();

      if (data.status !== "success") {
        setError(data.error || "Something went wrong");
      } else {
        setMutuals(data.data.mutuals || []);
      }
    } catch {
      setError("Unable to fetch mutuals. Please try again.");
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 shadow-2xl rounded-2xl bg-white/80">
        <CardContent className="flex flex-col gap-6 items-center">
          <div className="flex items-center gap-2 mb-2">
            <Image src={XLogo} alt="X logo" width={25} height={25} />
            <span className="font-bold text-2xl tracking-tight">Network Sync</span>
          </div>
          <div className="text-center">
            <div className="font-medium text-lg mb-1">
              Sync your network. Spot mutuals. Accelerate your intros.
            </div>
            <div className="text-gray-600 mb-2">
              Network Sync helps you instantly identify mutual Twitter connections with anyone - enabling warm introductions and deeper networking, especially within the Protocol Labs community.
            </div>
          </div>
          <form
            className="flex flex-col gap-4 w-full"
            onSubmit={e => {
              e.preventDefault();
              handleFindMutuals();
            }}
          >
            <Input
              placeholder="Enter Twitter username #1"
              value={user1}
              onChange={e => setUser1(e.target.value)}
              required
            />
            <Input
              placeholder="Enter Twitter username #2"
              value={user2}
              onChange={e => setUser2(e.target.value)}
              required
            />
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !user1 || !user2}
            >
              {loading ? "Finding..." : "Find Mutual Connections"}
            </Button>
          </form>
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          {!loading && mutuals.length === 0 && !error && (
            <div className="text-sm text-gray-600 mt-2">
              No mutual followings found.
            </div>
          )}
          {mutuals.length > 0 && (
            <div className="w-full mt-2">
              <div className="font-semibold mb-1">
                {mutuals.length} mutual connection{mutuals.length > 1 ? "s" : ""}
              </div>
              <ul className="text-sm bg-blue-50 rounded-xl px-3 py-2 max-h-40 overflow-y-auto">
                {mutuals.map((mutual, idx) => (
                  <li key={mutual.id || idx} className="py-1">
                    <a href={mutual.profile_url} target="_blank" rel="noopener noreferrer">
                      @{mutual.userName} <span className="text-gray-500">({mutual.name})</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="w-full text-center mt-2 text-gray-500 text-xs">
            Need richer results? <span className="underline cursor-pointer">Sync your followings</span>
          </div>
        </CardContent>
      </Card>
      <footer className="mt-10 text-gray-400 text-xs">
        Not affiliated with Twitter. Privacy-friendly.
      </footer>
    </main>
  );
}