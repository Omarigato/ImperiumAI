import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const SmartHome3D = dynamic(() => import('../components/SmartHome3D'), { ssr: false });
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function IoTLabPage() {
  const [prompt, setPrompt] = useState('Включи свет у входа');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState('');

  const loadStatus = async () => {
    try {
      setError('');
      const res = await fetch(`${API}/api/iot/prototype-status`);
      if (!res.ok) throw new Error(`Status request failed: ${res.status}`);
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      setError(e.message || 'Failed to load device status');
    }
  };

  useEffect(() => { loadStatus(); }, []);

  const sendPrompt = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      setError('');
      const res = await fetch(`${API}/api/iot/prototype-command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error(`Command failed: ${res.status}`);
      const data = await res.json();
      setResponse(data);
      setStatus((prev) => ({ ...(prev || {}), devices: data.device_states, llm: data.provider }));
    } catch (e) {
      setError(e.message || 'Failed to execute command');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a12] text-white">
      <header className="border-b border-cyan-500/20 px-6 py-3 flex items-center justify-between">
        <div className="text-lg font-bold text-cyan-300">AegisAI • IoT LLM Lab</div>
        <div className="flex gap-3 text-xs">
          <Link href="/" className="text-gray-300 hover:text-cyan-300">HOME</Link>
          <Link href="/battle" className="text-gray-300 hover:text-cyan-300">BATTLE</Link>
          <Link href="/agents" className="text-gray-300 hover:text-cyan-300">AGENTS</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-5 grid grid-cols-1 lg:grid-cols-5 gap-4">
        <section className="lg:col-span-3 h-[520px] rounded-2xl overflow-hidden border border-cyan-500/20 bg-black/30">
          <SmartHome3D deviceStates={status?.devices || {}} activeAttack={null} defendedTargets={[]} activeAgent={null} />
        </section>

        <section className="lg:col-span-2 space-y-4">
          <form onSubmit={sendPrompt} className="rounded-xl border border-emerald-400/20 bg-slate-900/60 p-4">
            <div className="text-xs text-emerald-300 tracking-[0.2em] mb-2">PROTOTYPE REQUEST</div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full min-h-24 rounded-lg bg-black/40 border border-slate-700 p-3 text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="mt-3 w-full rounded-lg py-2 bg-emerald-500/80 text-black font-bold disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send to LLM'}
            </button>
          </form>

          <div className="rounded-xl border border-cyan-400/20 bg-slate-900/60 p-4 text-xs space-y-2">
            <div className="text-cyan-300 tracking-[0.2em]">QUICK EXAMPLES</div>
            <div>• Включи свет у входа</div>
            <div>• Закрой дверь</div>
            <div>• Disable camera system</div>
            <div>• Set thermostat to 24</div>
          </div>

          {response && (
            <div className="rounded-xl border border-purple-400/20 bg-slate-900/60 p-4 text-xs space-y-2">
              <div className="text-purple-300 tracking-[0.2em]">LLM RESULT</div>
              <div>Provider: {response.provider}</div>
              <div>Action: {response.device_action?.action} → {response.device_action?.target}</div>
              <div className={response.iot_result?.success ? 'text-emerald-300' : 'text-red-300'}>
                {response.iot_result?.message}
              </div>
              <div className="text-gray-400">{response.llm?.reasoning}</div>
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-red-400/20 bg-red-950/30 p-4 text-xs text-red-200">
              {error}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
