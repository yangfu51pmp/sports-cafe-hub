'use client';

import React, { useEffect, useState } from 'react';
import {
  SENDAI_ISOLATION_CONFIG,
  SENDAI_ZONES,
  SendaiZoneType,
  SendaiHqState,
  DEFAULT_SENDAI_HQ_STATE,
  FinancialSimInput,
  CampSeasonCode,
  calculateSendaiVisaFinancials,
} from '../../lib/sendai-hq/types-and-defaults';

type TabKey = 'simulator' | 'scouts' | 'camps';

export default function SendaiHqPrepPage() {
  const [hqState, setHqState] = useState<SendaiHqState>(DEFAULT_SENDAI_HQ_STATE);
  const [activeTab, setActiveTab] = useState<TabKey>('simulator');
  const [savingMsg, setSavingMsg] = useState<string>('');

  const [scoutTitle, setScoutTitle] = useState<string>('');
  const [scoutZone, setScoutZone] = useState<SendaiZoneType>('baseball_core');
  const [scoutTsubo, setScoutTsubo] = useState<number>(35);
  const [scoutCeiling, setScoutCeiling] = useState<number>(3.5);
  const [scoutParking, setScoutParking] = useState<number>(4);
  const [scoutEv, setScoutEv] = useState<number>(2);
  const [scoutRent, setScoutRent] = useState<number>(220000);
  const [scoutDist, setScoutDist] = useState<number>(15);
  const [scoutIndep, setScoutIndep] = useState<boolean>(true);
  const [scoutNotes, setScoutNotes] = useState<string>('');

  const [parentName, setParentName] = useState<string>('');
  const [playerGrade, setPlayerGrade] = useState<string>('國小三年級 (U10)');
  const [teamOrArea, setTeamOrArea] = useState<string>('');
  const [targetSeason, setTargetSeason] = useState<CampSeasonCode>('2027_summer');
  const [leadNotes, setLeadNotes] = useState<string>('');

  useEffect(() => {
    fetch('/api/sendai-hq', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && d.state) setHqState(d.state);
      })
      .catch(() => {});
  }, []);

  const flashMsg = (msg: string) => {
    setSavingMsg(msg);
    setTimeout(() => setSavingMsg(''), 3000);
  };

  const updateSimField = <K extends keyof FinancialSimInput>(
    key: K,
    val: FinancialSimInput[K]
  ) => {
    setHqState((prev) => ({
      ...prev,
      simInput: {
        ...prev.simInput,
        [key]: val,
      },
    }));
  };

  const handleSaveSim = async () => {
    const res = await fetch('/api/sendai-hq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_sim', simInput: hqState.simInput }),
    });
    const d = await res.json();
    if (d?.ok && d.state) {
      setHqState(d.state);
      flashMsg('✅ 已儲存仙台複合店與經營管理簽證損益參數');
    }
  };

  const handleAddScout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scoutTitle.trim()) return;
    const res = await fetch('/api/sendai-hq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_scout',
        scout: {
          title: scoutTitle.trim(),
          zone: scoutZone,
          areaTsubo: scoutTsubo,
          ceilingHeightM: scoutCeiling,
          parkingSpaces: scoutParking,
          evChargerSlots: scoutEv,
          monthlyRentJpy: scoutRent,
          distanceToKusanoMin: scoutDist,
          hasIndependentEntrance: scoutIndep,
          notes: scoutNotes.trim(),
        },
      }),
    });
    const d = await res.json();
    if (d?.ok && d.state) {
      setHqState(d.state);
      setScoutTitle('');
      setScoutNotes('');
      flashMsg('✅ 已新增仙台場勘物件紀錄');
    }
  };

  const handleDeleteScout = async (id: string) => {
    const res = await fetch('/api/sendai-hq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_scout', id }),
    });
    const d = await res.json();
    if (d?.ok && d.state) setHqState(d.state);
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentName.trim()) return;
    const res = await fetch('/api/sendai-hq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_camp_lead',
        campLead: {
          parentName: parentName.trim(),
          playerGrade,
          teamOrArea: teamOrArea.trim() || '台灣少棒家庭',
          targetSeason,
          addons: ['草野塾特訓', '仙台語言中心日語體驗'],
          notes: leadNotes.trim(),
        },
      }),
    });
    const d = await res.json();
    if (d?.ok && d.state) {
      setHqState(d.state);
      setParentName('');
      setTeamOrArea('');
      setLeadNotes('');
      flashMsg('✅ 已新增台日少棒營隊意向名單');
    }
  };

  const handleDeleteLead = async (id: string) => {
    const res = await fetch('/api/sendai-hq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_camp_lead', id }),
    });
    const d = await res.json();
    if (d?.ok && d.state) setHqState(d.state);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(hqState, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sendai_SportCafe_M4_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const simResult = calculateSendaiVisaFinancials(hqState.simInput);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-2xl border border-emerald-500/40 bg-slate-900 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-900/70 border border-emerald-400/40 px-2.5 py-0.5 text-xs font-bold text-emerald-200">
                M4 籌備中樞｜100% 獨立隔離
              </span>
              <span className="text-xs text-slate-400">
                北極星：{SENDAI_ISOLATION_CONFIG.northStarGoal}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold text-white">
              ☕️⚾️ 仙台 Sport Café 複合門市 ＆ 日本經營管理簽證籌備工作台
            </h1>
            <p className="text-xs text-slate-400">
              簽證主體：{SENDAI_ISOLATION_CONFIG.visaApplicantRole} ｜ 四合一業態：無人咖啡 ＋ 體育用品展售外銷 ＋ 投球機 ＋ EV 充電樁 ＋ 台日少棒營隊
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportJson}
              className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-200 cursor-pointer"
            >
              ⬇ 匯出籌備備份 (.json)
            </button>
          </div>
        </div>

        {savingMsg && (
          <div className="rounded-xl border border-emerald-400 bg-emerald-950/80 px-4 py-2.5 text-xs font-bold text-emerald-200">
            {savingMsg}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`rounded-xl px-4 py-2.5 text-xs md:text-sm font-extrabold transition cursor-pointer ${
              activeTab === 'simulator'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-900 text-slate-300 border border-slate-800'
            }`}
          >
            📊 複合門市坪效 ＆ 簽證損益試算器
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scouts')}
            className={`rounded-xl px-4 py-2.5 text-xs md:text-sm font-extrabold transition cursor-pointer ${
              activeTab === 'scouts'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-900 text-slate-300 border border-slate-800'
            }`}
          >
            📍 仙台實地場勘紀錄庫 ({hqState.scouts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('camps')}
            className={`rounded-xl px-4 py-2.5 text-xs md:text-sm font-extrabold transition cursor-pointer ${
              activeTab === 'camps'
                ? 'bg-sky-400 text-slate-950'
                : 'bg-slate-900 text-slate-300 border border-slate-800'
            }`}
          >
            ⚾️ 草野塾合作・台日營隊意向池 ({hqState.campLeads.length})
          </button>
        </div>

        {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-base font-bold text-white">
                  四大營收引擎與日本法人固定成本設定
                </h2>
                <button
                  type="button"
                  onClick={handleSaveSim}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
                >
                  💾 儲存試算參數
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">日本法人資本金 (JPY)</label>
                  <input
                    type="number"
                    step={500000}
                    value={hqState.simInput.capitalJpy}
                    onChange={(e) => updateSimField('capitalJpy', Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">匯率換算 (JPY ➔ TWD)</label>
                  <input
                    type="number"
                    step={0.005}
                    value={hqState.simInput.exchangeRateJpyToTwd}
                    onChange={(e) =>
                      updateSimField('exchangeRateJpyToTwd', Number(e.target.value))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-amber-300 mb-1">
                    每日「咖啡＋投球機＋充電」組數
                  </label>
                  <input
                    type="number"
                    value={hqState.simInput.dailyCafePitchingSets}
                    onChange={(e) =>
                      updateSimField('dailyCafePitchingSets', Number(e.target.value))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-amber-300 mb-1">複合客單價 (JPY)</label>
                  <input
                    type="number"
                    step={100}
                    value={hqState.simInput.avgTicketCafePitchingJpy}
                    onChange={(e) =>
                      updateSimField('avgTicketCafePitchingJpy', Number(e.target.value))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sky-300 mb-1">
                    仙台門市球具月零售額 (JPY)
                  </label>
                  <input
                    type="number"
                    step={50000}
                    value={hqState.simInput.monthlyLocalGearSalesJpy}
                    onChange={(e) =>
                      updateSimField('monthlyLocalGearSalesJpy', Number(e.target.value))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-emerald-300 mb-1">
                    台灣電商＋新莊店月 B2B 採購輸血 (JPY)
                  </label>
                  <input
                    type="number"
                    step={50000}
                    value={hqState.simInput.monthlyTaiwanB2bExportJpy}
                    onChange={(e) =>
                      updateSimField('monthlyTaiwanB2bExportJpy', Number(e.target.value))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-purple-300 mb-1">每年台日少棒營隊梯次數</label>
                  <input
                    type="number"
                    value={hqState.simInput.annualCampBatches}
                    onChange={(e) =>
                      updateSimField('annualCampBatches', Number(e.target.value))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-purple-300 mb-1">每梯次學員數 × 團費 (JPY)</label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      value={hqState.simInput.playersPerBatch}
                      onChange={(e) =>
                        updateSimField('playersPerBatch', Number(e.target.value))
                      }
                      className="w-16 rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-white font-mono"
                    />
                    <input
                      type="number"
                      step={5000}
                      value={hqState.simInput.campFeePerPlayerJpy}
                      onChange={(e) =>
                        updateSimField('campFeePerPlayerJpy', Number(e.target.value))
                      }
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-rose-300 mb-1">仙台店面月租金 (JPY)</label>
                  <input
                    type="number"
                    step={10000}
                    value={hqState.simInput.monthlyRentJpy}
                    onChange={(e) =>
                      updateSimField('monthlyRentJpy', Number(e.target.value))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-rose-300 mb-1">
                    夫人役員報酬月薪 (JPY)
                  </label>
                  <input
                    type="number"
                    step={10000}
                    value={hqState.simInput.directorMonthlySalaryJpy}
                    onChange={(e) =>
                      updateSimField('directorMonthlySalaryJpy', Number(e.target.value))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
                <h2 className="text-base font-bold text-white border-b border-slate-800 pb-2">
                  日本法人年度流水與現金流預估
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-950 border border-slate-800 p-3.5">
                    <div className="text-xs text-slate-400">日本法人預估年營業額</div>
                    <div className="text-xl font-extrabold text-white font-mono mt-1">
                      ¥{simResult.annualRevJpy.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      約 NT${simResult.annualRevTwd.toLocaleString()} ／ 年
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-950 border border-slate-800 p-3.5">
                    <div className="text-xs text-slate-400">月營業利益（扣店租與夫人月薪）</div>
                    <div
                      className={`text-xl font-extrabold font-mono mt-1 ${
                        simResult.monthlyOperatingProfitJpy >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {simResult.monthlyOperatingProfitJpy >= 0 ? '+' : ''}¥
                      {simResult.monthlyOperatingProfitJpy.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-sky-300 mt-0.5">
                      外銷消費稅退稅增厚：約 +¥
                      {simResult.monthlyExportTaxRefundJpy.toLocaleString()} / 月
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs bg-slate-950/70 rounded-xl p-3.5 border border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-400">☕️ 無人咖啡＋投球機＋充電月營收</span>
                    <span className="font-mono text-amber-300">
                      ¥{simResult.monthlyCafePitchingRevJpy.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">🧤 仙台門市球具展售月營收</span>
                    <span className="font-mono text-sky-300">
                      ¥{simResult.monthlyLocalGearRevJpy.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">
                      🇹🇼 台灣電商＋新莊店 B2B 採購輸血 ({simResult.taiwanB2bSharePct}%)
                    </span>
                    <span className="font-mono text-emerald-300">
                      ¥{simResult.monthlyTaiwanB2bRevJpy.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">⚾️ 寒暑假台日營隊月均攤營收</span>
                    <span className="font-mono text-purple-300">
                      ¥{simResult.monthlyCampAmortizedRevJpy.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3">
                <h3 className="text-sm font-bold text-amber-300">
                  🛂 日本經營管理簽證核發 ＆ 續簽體質檢核燈號
                </h3>
                <div className="space-y-2">
                  {simResult.visaChecks.map((chk) => (
                    <div
                      key={chk.id}
                      className={`rounded-xl border p-3 text-xs ${
                        chk.passed
                          ? 'border-emerald-500/40 bg-emerald-950/30'
                          : 'border-rose-500/40 bg-rose-950/30'
                      }`}
                    >
                      <div className="font-bold text-white">
                        {chk.passed ? '🟢 通過檢核｜' : '🔴 需留意調整｜'}
                        {chk.label}
                      </div>
                      <div className="text-slate-300 mt-1">{chk.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'scouts' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={handleAddScout}
              className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3 text-xs"
            >
              <h2 className="text-base font-bold text-amber-300">
                ➕ 新增仙台實地場勘紀錄（支援手機踩點直填）
              </h2>
              <div>
                <label className="block text-slate-400 mb-1">物件名稱／地標位置</label>
                <input
                  type="text"
                  required
                  value={scoutTitle}
                  onChange={(e) => setScoutTitle(e.target.value)}
                  placeholder="例：宮城野區原町幹道一樓店面"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">選址戰略分區</label>
                <select
                  value={scoutZone}
                  onChange={(e) => setScoutZone(e.target.value as SendaiZoneType)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                >
                  {(Object.keys(SENDAI_ZONES) as SendaiZoneType[]).map((z) => (
                    <option key={z} value={z}>
                      {SENDAI_ZONES[z].label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-400 mb-1">面積 (坪)</label>
                  <input
                    type="number"
                    value={scoutTsubo}
                    onChange={(e) => setScoutTsubo(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">室內挑高 (m，建議≥3.2)</label>
                  <input
                    type="number"
                    step={0.1}
                    value={scoutCeiling}
                    onChange={(e) => setScoutCeiling(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">停車位數</label>
                  <input
                    type="number"
                    value={scoutParking}
                    onChange={(e) => setScoutParking(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">可設 EV 充電樁數</label>
                  <input
                    type="number"
                    value={scoutEv}
                    onChange={(e) => setScoutEv(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">月租金 (JPY)</label>
                  <input
                    type="number"
                    step={10000}
                    value={scoutRent}
                    onChange={(e) => setScoutRent(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">距草野塾車程 (分)</label>
                  <input
                    type="number"
                    value={scoutDist}
                    onChange={(e) => setScoutDist(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-white"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 pt-1 text-emerald-300 font-semibold">
                <input
                  type="checkbox"
                  checked={scoutIndep}
                  onChange={(e) => setScoutIndep(e.target.checked)}
                />
                具備實體獨立出入口與招牌空間（日本經營管理簽證必備）
              </label>
              <textarea
                rows={3}
                value={scoutNotes}
                onChange={(e) => setScoutNotes(e.target.value)}
                placeholder="電力容量、周邊學區、房東對外國法人態度等現場觀察..."
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-white"
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-amber-400 hover:bg-amber-300 py-2.5 font-extrabold text-slate-950 cursor-pointer"
              >
                📍 儲存場勘物件
              </button>
            </form>

            <div className="lg:col-span-7 space-y-3">
              {hqState.scouts.map((s) => (
                <div
                  key={s.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-2 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-amber-300 font-bold">
                      {SENDAI_ZONES[s.zone].label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">{s.createdAt}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteScout(s.id)}
                        className="text-rose-400 hover:underline cursor-pointer"
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                  <div className="text-sm font-extrabold text-white">{s.title}</div>
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
                    <span className="rounded bg-slate-950 px-2 py-1">📐 {s.areaTsubo} 坪</span>
                    <span
                      className={`rounded px-2 py-1 ${
                        s.ceilingHeightM >= 3.2
                          ? 'bg-emerald-950/70 text-emerald-300'
                          : 'bg-rose-950/70 text-rose-300'
                      }`}
                    >
                      ↕️ 挑高 {s.ceilingHeightM}m {s.ceilingHeightM >= 3.2 ? '(適合投球道)' : '(偏低)'}
                    </span>
                    <span className="rounded bg-slate-950 px-2 py-1">
                      🚗 車位 {s.parkingSpaces} / ⚡ EV樁 {s.evChargerSlots}
                    </span>
                    <span className="rounded bg-slate-950 px-2 py-1 font-mono">
                      💴 月租 ¥{s.monthlyRentJpy.toLocaleString()}
                    </span>
                    <span className="rounded bg-slate-950 px-2 py-1">
                      ⚾ 距草野塾 {s.distanceToKusanoMin} 分
                    </span>
                  </div>
                  {s.notes && <p className="text-slate-400 leading-relaxed">{s.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'camps' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={handleAddLead}
              className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3 text-xs"
            >
              <h2 className="text-base font-bold text-sky-300">
                ➕ 登記「仙台草野塾＋日語微留學營」潛在家長名單
              </h2>
              <div>
                <label className="block text-slate-400 mb-1">家長稱呼／聯絡識別</label>
                <input
                  type="text"
                  required
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="例：林爸爸（IG 私訊詢問）"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-400 mb-1">小球員年級組別</label>
                  <input
                    type="text"
                    value={playerGrade}
                    onChange={(e) => setPlayerGrade(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">所屬地區／球隊性質</label>
                  <input
                    type="text"
                    value={teamOrArea}
                    onChange={(e) => setTeamOrArea(e.target.value)}
                    placeholder="例：雙北社區少棒"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">意向參加梯次</label>
                <select
                  value={targetSeason}
                  onChange={(e) => setTargetSeason(e.target.value as CampSeasonCode)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                >
                  <option value="2027_summer">2027 暑假仙台主力梯</option>
                  <option value="2028_winter">2028 寒假冬日特訓梯</option>
                  <option value="2028_summer">2028 暑假仙台主力梯</option>
                  <option value="2029_flagship">2029 仙台門市開幕旗艦梯</option>
                </select>
              </div>
              <textarea
                rows={3}
                value={leadNotes}
                onChange={(e) => setLeadNotes(e.target.value)}
                placeholder="需求備註（例如：想同步安排日語體驗課、媽媽想逛仙台選物）..."
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-white"
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-sky-400 hover:bg-sky-300 py-2.5 font-extrabold text-slate-950 cursor-pointer"
              >
                ⚾️ 加入營隊蓄水池
              </button>
            </form>

            <div className="lg:col-span-7 space-y-3">
              {hqState.campLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-sky-950 border border-sky-500/40 px-2.5 py-0.5 text-sky-300 font-bold">
                      梯次：{lead.targetSeason}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteLead(lead.id)}
                      className="text-rose-400 hover:underline cursor-pointer"
                    >
                      移除
                    </button>
                  </div>
                  <div className="text-sm font-bold text-white">
                    {lead.parentName} ｜ {lead.playerGrade}（{lead.teamOrArea}）
                  </div>
                  {lead.notes && <p className="text-slate-400">{lead.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
