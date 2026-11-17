export const SENDAI_ISOLATION_CONFIG = {
  redisKeyPrefix: 'pinfu:sendai:m4:v1',
  localFallbackFile: '/tmp/pinfu-sendai-m4-state.json',
  visaApplicantRole: '夫人（日本經營管理簽證主申請人）',
  northStarGoal: '2029 智也國小畢業銜接日本仙台國中',
} as const;

export type SendaiZoneType =
  | 'baseball_core'
  | 'suburban_arterial'
  | 'edu_station';

export const SENDAI_ZONES: Record<
  SendaiZoneType,
  { label: string; desc: string }
> = {
  baseball_core: {
    label: '宮城野區／若林區（棒球核心圈）',
    desc: '鄰近樂天主場與草野塾生活圈，學童野球人口密集、利於教練互動與營隊接駁',
  },
  suburban_arterial: {
    label: '泉區／名取市（郊區幹道大腹地）',
    desc: '停車腹地充足、室內挑高佳，適合同步配置 EV 充電樁與室內投球機打擊球道',
  },
  edu_station: {
    label: '青葉區／太白區（文教地鐵圈）',
    desc: '鄰近優質國中學區與語言學校，家庭生活機能成熟',
  },
};

export interface SiteScoutRecord {
  id: string;
  createdAt: string;
  title: string;
  zone: SendaiZoneType;
  areaTsubo: number;
  ceilingHeightM: number;
  parkingSpaces: number;
  evChargerSlots: number;
  monthlyRentJpy: number;
  distanceToKusanoMin: number;
  hasIndependentEntrance: boolean;
  notes: string;
}

export interface FinancialSimInput {
  exchangeRateJpyToTwd: number;
  capitalJpy: number;
  dailyCafePitchingSets: number;
  avgTicketCafePitchingJpy: number;
  monthlyLocalGearSalesJpy: number;
  monthlyTaiwanB2bExportJpy: number;
  annualCampBatches: number;
  playersPerBatch: number;
  campFeePerPlayerJpy: number;
  monthlyRentJpy: number;
  directorMonthlySalaryJpy: number;
  monthlyOpsAndTaxAdvisorJpy: number;
}

export interface VisaCheckItem {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface FinancialSimResult {
  monthlyCafePitchingRevJpy: number;
  monthlyLocalGearRevJpy: number;
  monthlyTaiwanB2bRevJpy: number;
  monthlyCampAmortizedRevJpy: number;
  totalMonthlyRevJpy: number;
  annualRevJpy: number;
  annualRevTwd: number;
  monthlyGrossProfitJpy: number;
  monthlyFixedCostJpy: number;
  monthlyOperatingProfitJpy: number;
  monthlyExportTaxRefundJpy: number;
  monthlyNetCashflowJpy: number;
  taiwanB2bSharePct: number;
  visaChecks: VisaCheckItem[];
}

export type CampSeasonCode =
  | '2027_summer'
  | '2028_winter'
  | '2028_summer'
  | '2029_flagship';

export interface CampLeadRecord {
  id: string;
  createdAt: string;
  parentName: string;
  playerGrade: string;
  teamOrArea: string;
  targetSeason: CampSeasonCode;
  addons: string[];
  notes: string;
}

export interface SendaiHqState {
  updatedAt: string;
  scouts: SiteScoutRecord[];
  simInput: FinancialSimInput;
  campLeads: CampLeadRecord[];
}

export const DEFAULT_SENDAI_HQ_STATE: SendaiHqState = {
  updatedAt: new Date().toISOString(),
  scouts: [
    {
      id: 'scout-demo-1',
      createdAt: '2026-11-18',
      title: '【2027/01 場勘預備】宮城野區幹道沿線一樓挑高路面店',
      zone: 'baseball_core',
      areaTsubo: 32,
      ceilingHeightM: 3.6,
      parkingSpaces: 4,
      evChargerSlots: 2,
      monthlyRentJpy: 240000,
      distanceToKusanoMin: 12,
      hasIndependentEntrance: true,
      notes: '鄰近樂天球場生活圈，適合配置 1 道軟式投球機＋無人咖啡吧台＋球具出口打包室。',
    },
    {
      id: 'scout-demo-2',
      createdAt: '2026-11-18',
      title: '【2027/01 場勘預備】泉區住宅幹道獨立倉庫型複合空間',
      zone: 'suburban_arterial',
      areaTsubo: 45,
      ceilingHeightM: 4.2,
      parkingSpaces: 6,
      evChargerSlots: 3,
      monthlyRentJpy: 210000,
      distanceToKusanoMin: 18,
      hasIndependentEntrance: true,
      notes: '停車位寬敞，適合家長電動車充電等待時讓孩子練打擊並挑選日本球具。',
    },
  ],
  simInput: {
    exchangeRateJpyToTwd: 0.215,
    capitalJpy: 6000000,
    dailyCafePitchingSets: 18,
    avgTicketCafePitchingJpy: 1400,
    monthlyLocalGearSalesJpy: 350000,
    monthlyTaiwanB2bExportJpy: 850000,
    annualCampBatches: 2,
    playersPerBatch: 12,
    campFeePerPlayerJpy: 168000,
    monthlyRentJpy: 230000,
    directorMonthlySalaryJpy: 300000,
    monthlyOpsAndTaxAdvisorJpy: 115000,
  },
  campLeads: [
    {
      id: 'lead-demo-1',
      createdAt: '2026-11-18',
      parentName: '新北少棒家長（範例）',
      playerGrade: '國小三年級 (U10)',
      teamOrArea: '新北市校隊',
      targetSeason: '2027_summer',
      addons: ['草野塾守備打擊課', '仙台語言中心日語體驗', '日本少年軟式手套選購'],
      notes: '關注 2027 暑假仙台移地訓練梯次與親子同行住宿安排。',
    },
  ],
};

export function calculateSendaiVisaFinancials(
  input: FinancialSimInput
): FinancialSimResult {
  const monthlyCafePitchingRevJpy = Math.round(
    input.dailyCafePitchingSets * input.avgTicketCafePitchingJpy * 30
  );
  const monthlyLocalGearRevJpy = Math.round(input.monthlyLocalGearSalesJpy);
  const monthlyTaiwanB2bRevJpy = Math.round(input.monthlyTaiwanB2bExportJpy);
  const monthlyCampAmortizedRevJpy = Math.round(
    (input.annualCampBatches * input.playersPerBatch * input.campFeePerPlayerJpy) / 12
  );

  const totalMonthlyRevJpy =
    monthlyCafePitchingRevJpy +
    monthlyLocalGearRevJpy +
    monthlyTaiwanB2bRevJpy +
    monthlyCampAmortizedRevJpy;

  const annualRevJpy = totalMonthlyRevJpy * 12;
  const annualRevTwd = Math.round(annualRevJpy * input.exchangeRateJpyToTwd);

  const grossCafePitching = monthlyCafePitchingRevJpy * 0.74;
  const grossLocalGear = monthlyLocalGearRevJpy * 0.34;
  const grossTaiwanB2b = monthlyTaiwanB2bRevJpy * 0.2;
  const grossCamp = monthlyCampAmortizedRevJpy * 0.42;

  const monthlyGrossProfitJpy = Math.round(
    grossCafePitching + grossLocalGear + grossTaiwanB2b + grossCamp
  );

  const monthlyFixedCostJpy = Math.round(
    input.monthlyRentJpy +
      input.directorMonthlySalaryJpy +
      input.monthlyOpsAndTaxAdvisorJpy
  );

  const monthlyOperatingProfitJpy = monthlyGrossProfitJpy - monthlyFixedCostJpy;
  const monthlyExportTaxRefundJpy = Math.round(
    (monthlyTaiwanB2bRevJpy / 1.1) * 0.1
  );
  const monthlyNetCashflowJpy =
    monthlyOperatingProfitJpy + monthlyExportTaxRefundJpy;

  const taiwanB2bSharePct =
    totalMonthlyRevJpy > 0
      ? Math.round((monthlyTaiwanB2bRevJpy / totalMonthlyRevJpy) * 100)
      : 0;

  const visaChecks: VisaCheckItem[] = [
    {
      id: 'capital',
      label: '日本法人資本金安全水位',
      passed: input.capitalJpy >= 5000000,
      detail: `設定資本金 ¥${input.capitalJpy.toLocaleString()}（符合 ≥500 萬日圓基礎門檻；簽證送件前可配合最新日本入管法規彈性調升）`,
    },
    {
      id: 'profitability',
      label: '法人損益黒字化（續簽核心指標）',
      passed: monthlyOperatingProfitJpy > 0,
      detail:
        monthlyOperatingProfitJpy > 0
          ? `扣除役員報酬與店租後，月營業利益 +¥${monthlyOperatingProfitJpy.toLocaleString()}，具備穩定續簽財務體質`
          : `目前月營業損益 ¥${monthlyOperatingProfitJpy.toLocaleString()}，建議微調台灣 B2B 採購額或營隊人數以達成黒字化`,
    },
    {
      id: 'director_comp',
      label: '主申請人（夫人）役員報酬合理性',
      passed: input.directorMonthlySalaryJpy >= 250000,
      detail: `設定月薪 ¥${input.directorMonthlySalaryJpy.toLocaleString()}（足以支撐母子在仙台生活開銷與社保納稅紀錄）`,
    },
    {
      id: 'revenue_mix',
      label: '日本在地營收 vs 台灣 B2B 輸血均衡度',
      passed: taiwanB2bSharePct >= 20 && taiwanB2bSharePct <= 65,
      detail: `台灣 B2B 採購佔總流水 ${taiwanB2bSharePct}%（兼顧穩定輸血與日本在地門市＋營隊實質營運說服力）`,
    },
  ];

  return {
    monthlyCafePitchingRevJpy,
    monthlyLocalGearRevJpy,
    monthlyTaiwanB2bRevJpy,
    monthlyCampAmortizedRevJpy,
    totalMonthlyRevJpy,
    annualRevJpy,
    annualRevTwd,
    monthlyGrossProfitJpy,
    monthlyFixedCostJpy,
    monthlyOperatingProfitJpy,
    monthlyExportTaxRefundJpy,
    monthlyNetCashflowJpy,
    taiwanB2bSharePct,
    visaChecks,
  };
}
