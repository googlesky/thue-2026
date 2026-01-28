/**
 * Double Tax Treaty Data - Hiệp định tránh đánh thuế hai lần
 *
 * Việt Nam đã ký kết hiệp định thuế với 80+ quốc gia và vùng lãnh thổ.
 * Dữ liệu này cung cấp thông tin tham khảo về thuế suất tối đa theo hiệp định.
 *
 * Căn cứ: Các hiệp định thuế song phương của Việt Nam
 * Nguồn: Bộ Tài chính Việt Nam, OECD
 */

// ===== TYPES =====

export interface TaxTreaty {
  // Thông tin cơ bản
  countryCode: string;           // Mã quốc gia ISO
  countryName: string;           // Tên tiếng Việt
  countryNameEn: string;         // Tên tiếng Anh
  signDate: string;              // Ngày ký (YYYY-MM-DD)
  effectiveDate: string;         // Ngày có hiệu lực (YYYY-MM-DD)
  status: 'active' | 'pending' | 'terminated';

  // Thuế suất tối đa theo hiệp định (%)
  rates: {
    dividends: {
      standard: number;          // Thuế suất chuẩn
      qualified?: number;        // Thuế suất ưu đãi (góp vốn >= threshold)
      qualifiedThreshold?: number; // Ngưỡng góp vốn (%)
      note?: string;
    };
    interest: {
      standard: number;
      govBond: number;           // Trái phiếu Chính phủ (thường 0%)
      note?: string;
    };
    royalties: {
      standard: number;
      note?: string;
    };
    technicalServices?: {
      rate: number;              // Một số hiệp định có thuế riêng cho dịch vụ kỹ thuật
      note?: string;
    };
  };

  // Quy định về thu nhập từ lao động
  employment: {
    daysThreshold: number;       // Số ngày tối đa để được miễn thuế (thường 183)
    period: '12months' | 'calendar' | 'fiscal';
    note?: string;
  };

  // Điều khoản đặc biệt
  specialProvisions?: string[];

  // Phương pháp tránh đánh thuế hai lần
  method: 'credit' | 'exemption' | 'both';
  methodNote?: string;
}

export type TreatyCountryCode = string;

// ===== DATA =====

/**
 * Danh sách hiệp định thuế của Việt Nam
 * Ưu tiên các quốc gia có nhiều người Việt Nam làm việc
 */
export const TAX_TREATIES: Record<TreatyCountryCode, TaxTreaty> = {
  // CHÂU Á
  JP: {
    countryCode: 'JP',
    countryName: 'Nhật Bản',
    countryNameEn: 'Japan',
    signDate: '1995-10-24',
    effectiveDate: '1996-12-31',
    status: 'active',
    rates: {
      dividends: {
        standard: 10,
        qualified: 10,
        qualifiedThreshold: 25,
        note: '10% cho mọi trường hợp',
      },
      interest: {
        standard: 10,
        govBond: 0,
        note: 'Miễn thuế lãi TPCP và ngân hàng Nhà nước',
      },
      royalties: {
        standard: 10,
      },
    },
    employment: {
      daysThreshold: 183,
      period: 'calendar',
      note: 'Tính trong năm dương lịch',
    },
    specialProvisions: [
      'Điều khoản về giáo viên, sinh viên',
      'Điều khoản về thu nhập từ chính phủ',
    ],
    method: 'credit',
    methodNote: 'Khấu trừ thuế đã nộp tại nước nguồn',
  },

  KR: {
    countryCode: 'KR',
    countryName: 'Hàn Quốc',
    countryNameEn: 'South Korea',
    signDate: '1994-09-20',
    effectiveDate: '1995-09-13',
    status: 'active',
    rates: {
      dividends: {
        standard: 10,
        qualified: 10,
        note: '10% cho mọi trường hợp',
      },
      interest: {
        standard: 10,
        govBond: 0,
      },
      royalties: {
        standard: 15,
        note: 'Có thể giảm theo dự án đầu tư đặc biệt',
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
    },
    method: 'credit',
  },

  TW: {
    countryCode: 'TW',
    countryName: 'Đài Loan',
    countryNameEn: 'Taiwan',
    signDate: '1998-04-06',
    effectiveDate: '1999-05-06',
    status: 'active',
    rates: {
      dividends: {
        standard: 15,
        qualified: 10,
        qualifiedThreshold: 25,
      },
      interest: {
        standard: 10,
        govBond: 0,
      },
      royalties: {
        standard: 15,
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
    },
    method: 'credit',
  },

  SG: {
    countryCode: 'SG',
    countryName: 'Singapore',
    countryNameEn: 'Singapore',
    signDate: '1994-03-02',
    effectiveDate: '1994-08-12',
    status: 'active',
    rates: {
      dividends: {
        standard: 12.5,
        qualified: 5,
        qualifiedThreshold: 25,
        note: '5% nếu góp vốn >= 25%, 12.5% các trường hợp khác',
      },
      interest: {
        standard: 10,
        govBond: 0,
      },
      royalties: {
        standard: 10,
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
    },
    method: 'credit',
  },

  CN: {
    countryCode: 'CN',
    countryName: 'Trung Quốc',
    countryNameEn: 'China',
    signDate: '1995-05-17',
    effectiveDate: '1996-10-18',
    status: 'active',
    rates: {
      dividends: {
        standard: 10,
        note: '10% cho mọi trường hợp',
      },
      interest: {
        standard: 10,
        govBond: 0,
      },
      royalties: {
        standard: 10,
      },
    },
    employment: {
      daysThreshold: 183,
      period: 'calendar',
    },
    method: 'credit',
  },

  TH: {
    countryCode: 'TH',
    countryName: 'Thái Lan',
    countryNameEn: 'Thailand',
    signDate: '1992-12-23',
    effectiveDate: '1993-12-29',
    status: 'active',
    rates: {
      dividends: {
        standard: 15,
        qualified: 10,
        qualifiedThreshold: 25,
      },
      interest: {
        standard: 15,
        govBond: 0,
      },
      royalties: {
        standard: 15,
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
    },
    method: 'credit',
  },

  MY: {
    countryCode: 'MY',
    countryName: 'Malaysia',
    countryNameEn: 'Malaysia',
    signDate: '1995-09-07',
    effectiveDate: '1996-08-13',
    status: 'active',
    rates: {
      dividends: {
        standard: 15,
        qualified: 10,
        qualifiedThreshold: 25,
      },
      interest: {
        standard: 10,
        govBond: 0,
      },
      royalties: {
        standard: 10,
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
    },
    method: 'credit',
  },

  // CHÂU ÂU
  DE: {
    countryCode: 'DE',
    countryName: 'Đức',
    countryNameEn: 'Germany',
    signDate: '1995-07-13',
    effectiveDate: '1996-12-27',
    status: 'active',
    rates: {
      dividends: {
        standard: 15,
        qualified: 10,
        qualifiedThreshold: 25,
      },
      interest: {
        standard: 10,
        govBond: 0,
      },
      royalties: {
        standard: 10,
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
    },
    method: 'credit',
  },

  FR: {
    countryCode: 'FR',
    countryName: 'Pháp',
    countryNameEn: 'France',
    signDate: '1993-02-10',
    effectiveDate: '1994-07-01',
    status: 'active',
    rates: {
      dividends: {
        standard: 15,
        qualified: 7,
        qualifiedThreshold: 70,
        note: '7% nếu góp vốn >= 70%, 15% các trường hợp khác',
      },
      interest: {
        standard: 0,
        govBond: 0,
        note: 'Miễn thuế hoàn toàn lãi',
      },
      royalties: {
        standard: 10,
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
    },
    method: 'credit',
  },

  GB: {
    countryCode: 'GB',
    countryName: 'Anh',
    countryNameEn: 'United Kingdom',
    signDate: '1994-07-09',
    effectiveDate: '1995-12-15',
    status: 'active',
    rates: {
      dividends: {
        standard: 15,
        qualified: 10,
        qualifiedThreshold: 70,
      },
      interest: {
        standard: 10,
        govBond: 0,
      },
      royalties: {
        standard: 10,
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
    },
    method: 'credit',
  },

  NL: {
    countryCode: 'NL',
    countryName: 'Hà Lan',
    countryNameEn: 'Netherlands',
    signDate: '1995-03-24',
    effectiveDate: '1996-01-25',
    status: 'active',
    rates: {
      dividends: {
        standard: 15,
        qualified: 10,
        qualifiedThreshold: 25,
      },
      interest: {
        standard: 10,
        govBond: 0,
      },
      royalties: {
        standard: 15,
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
    },
    method: 'credit',
  },

  RU: {
    countryCode: 'RU',
    countryName: 'Nga',
    countryNameEn: 'Russia',
    signDate: '1993-05-27',
    effectiveDate: '1996-03-21',
    status: 'active',
    rates: {
      dividends: {
        standard: 15,
        qualified: 10,
        qualifiedThreshold: 25,
      },
      interest: {
        standard: 10,
        govBond: 0,
      },
      royalties: {
        standard: 15,
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
    },
    method: 'credit',
  },

  // CHÂU MỸ
  US: {
    countryCode: 'US',
    countryName: 'Hoa Kỳ',
    countryNameEn: 'United States',
    signDate: '2015-07-07',
    effectiveDate: '2016-12-22',
    status: 'active',
    rates: {
      dividends: {
        standard: 15,
        qualified: 10,
        qualifiedThreshold: 25,
      },
      interest: {
        standard: 10,
        govBond: 0,
      },
      royalties: {
        standard: 10,
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
      note: 'Quy định đặc biệt cho người lao động di chuyển trong năm thuế',
    },
    specialProvisions: [
      'Điều khoản chống lạm dụng (LOB)',
      'Trao đổi thông tin thuế tự động (CRS)',
    ],
    method: 'credit',
  },

  CA: {
    countryCode: 'CA',
    countryName: 'Canada',
    countryNameEn: 'Canada',
    signDate: '1997-11-14',
    effectiveDate: '1998-12-16',
    status: 'active',
    rates: {
      dividends: {
        standard: 15,
        qualified: 10,
        qualifiedThreshold: 25,
      },
      interest: {
        standard: 10,
        govBond: 0,
      },
      royalties: {
        standard: 10,
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
    },
    method: 'credit',
  },

  // CHÂU ĐẠI DƯƠNG
  AU: {
    countryCode: 'AU',
    countryName: 'Úc',
    countryNameEn: 'Australia',
    signDate: '1992-04-13',
    effectiveDate: '1992-12-30',
    status: 'active',
    rates: {
      dividends: {
        standard: 15,
        qualified: 10,
        qualifiedThreshold: 25,
      },
      interest: {
        standard: 10,
        govBond: 0,
      },
      royalties: {
        standard: 10,
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
    },
    method: 'credit',
  },

  NZ: {
    countryCode: 'NZ',
    countryName: 'New Zealand',
    countryNameEn: 'New Zealand',
    signDate: '2013-08-05',
    effectiveDate: '2014-10-08',
    status: 'active',
    rates: {
      dividends: {
        standard: 15,
        qualified: 15,
        note: '15% cho mọi trường hợp',
      },
      interest: {
        standard: 10,
        govBond: 0,
      },
      royalties: {
        standard: 10,
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
    },
    method: 'credit',
  },

  // ASEAN KHÁC
  ID: {
    countryCode: 'ID',
    countryName: 'Indonesia',
    countryNameEn: 'Indonesia',
    signDate: '1997-10-22',
    effectiveDate: '1999-02-10',
    status: 'active',
    rates: {
      dividends: {
        standard: 15,
        qualified: 15,
      },
      interest: {
        standard: 15,
        govBond: 0,
      },
      royalties: {
        standard: 15,
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
    },
    method: 'credit',
  },

  PH: {
    countryCode: 'PH',
    countryName: 'Philippines',
    countryNameEn: 'Philippines',
    signDate: '2001-11-14',
    effectiveDate: '2003-09-29',
    status: 'active',
    rates: {
      dividends: {
        standard: 15,
        qualified: 10,
        qualifiedThreshold: 25,
      },
      interest: {
        standard: 15,
        govBond: 0,
      },
      royalties: {
        standard: 15,
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
    },
    method: 'credit',
  },
};

// ===== HELPER FUNCTIONS =====

/**
 * Lấy danh sách quốc gia có hiệp định thuế
 */
export function getTreatyCountries(): Array<{
  code: string;
  name: string;
  nameEn: string;
}> {
  return Object.values(TAX_TREATIES)
    .filter(t => t.status === 'active')
    .map(t => ({
      code: t.countryCode,
      name: t.countryName,
      nameEn: t.countryNameEn,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

/**
 * Lấy thông tin hiệp định theo mã quốc gia
 */
export function getTreaty(countryCode: string): TaxTreaty | null {
  return TAX_TREATIES[countryCode.toUpperCase()] || null;
}

/**
 * So sánh thuế suất trong nước và theo hiệp định
 */
export function compareRates(countryCode: string): {
  country: TaxTreaty;
  comparison: {
    dividends: { domestic: number; treaty: number; savings: number };
    interest: { domestic: number; treaty: number; savings: number };
    royalties: { domestic: number; treaty: number; savings: number };
  };
} | null {
  const treaty = getTreaty(countryCode);
  if (!treaty) return null;

  // Thuế suất trong nước cho người không cư trú
  const DOMESTIC_RATES = {
    dividends: 5,     // 5%
    interest: 5,      // 5%
    royalties: 5,     // 5%
  };

  return {
    country: treaty,
    comparison: {
      dividends: {
        domestic: DOMESTIC_RATES.dividends,
        treaty: treaty.rates.dividends.standard,
        savings: DOMESTIC_RATES.dividends - Math.min(DOMESTIC_RATES.dividends, treaty.rates.dividends.standard),
      },
      interest: {
        domestic: DOMESTIC_RATES.interest,
        treaty: treaty.rates.interest.standard,
        savings: DOMESTIC_RATES.interest - Math.min(DOMESTIC_RATES.interest, treaty.rates.interest.standard),
      },
      royalties: {
        domestic: DOMESTIC_RATES.royalties,
        treaty: treaty.rates.royalties.standard,
        savings: DOMESTIC_RATES.royalties - Math.min(DOMESTIC_RATES.royalties, treaty.rates.royalties.standard),
      },
    },
  };
}

/**
 * Kiểm tra điều kiện 183 ngày cho thu nhập từ lao động
 */
export function check183DayRule(
  countryCode: string,
  daysInVietnam: number,
  period: 'calendar' | '12months' = '12months'
): {
  eligible: boolean;
  daysThreshold: number;
  daysRemaining: number;
  explanation: string;
} {
  const treaty = getTreaty(countryCode);
  const threshold = treaty?.employment.daysThreshold || 183;

  const eligible = daysInVietnam < threshold;
  const daysRemaining = threshold - daysInVietnam;

  let explanation: string;
  if (eligible) {
    explanation = `Có mặt ${daysInVietnam} ngày (< ${threshold} ngày) - có thể được miễn thuế thu nhập từ lao động tại Việt Nam theo hiệp định.`;
  } else {
    explanation = `Có mặt ${daysInVietnam} ngày (>= ${threshold} ngày) - phải nộp thuế thu nhập từ lao động tại Việt Nam.`;
  }

  return {
    eligible,
    daysThreshold: threshold,
    daysRemaining: Math.max(0, daysRemaining),
    explanation,
  };
}

/**
 * Tính thuế khấu trừ có áp dụng hiệp định
 */
export function calculateWithholdingWithTreaty(
  countryCode: string,
  incomeType: 'dividends' | 'interest' | 'royalties',
  amount: number,
  isQualified: boolean = false
): {
  domesticRate: number;
  domesticTax: number;
  treatyRate: number;
  treatyTax: number;
  savings: number;
  appliedRate: number;
  notes: string[];
} {
  const treaty = getTreaty(countryCode);
  const notes: string[] = [];

  // Thuế suất trong nước
  const DOMESTIC_RATES: Record<string, number> = {
    dividends: 0.05,
    interest: 0.05,
    royalties: 0.05,
  };

  const domesticRate = DOMESTIC_RATES[incomeType];
  const domesticTax = Math.round(amount * domesticRate);

  if (!treaty) {
    notes.push('Không có hiệp định thuế với quốc gia này - áp dụng thuế suất trong nước.');
    return {
      domesticRate,
      domesticTax,
      treatyRate: domesticRate,
      treatyTax: domesticTax,
      savings: 0,
      appliedRate: domesticRate,
      notes,
    };
  }

  // Thuế suất theo hiệp định
  let treatyRate: number;
  const rateInfo = treaty.rates[incomeType];

  if (incomeType === 'dividends' && isQualified && treaty.rates.dividends.qualified) {
    treatyRate = treaty.rates.dividends.qualified / 100;
    notes.push(`Áp dụng thuế suất ưu đãi ${treaty.rates.dividends.qualified}% cho cổ tức (góp vốn >= ${treaty.rates.dividends.qualifiedThreshold}%).`);
  } else if (incomeType === 'interest' && treaty.rates.interest.govBond === 0) {
    // Check if special interest provisions apply
    treatyRate = treaty.rates.interest.standard / 100;
  } else {
    treatyRate = (rateInfo as { standard: number }).standard / 100;
  }

  const treatyTax = Math.round(amount * treatyRate);
  const appliedRate = Math.min(domesticRate, treatyRate);
  const savings = domesticTax - Math.round(amount * appliedRate);

  notes.push(`Hiệp định với ${treaty.countryName}: thuế suất tối đa ${(treatyRate * 100).toFixed(0)}%.`);

  if (savings > 0) {
    notes.push(`Tiết kiệm ${savings.toLocaleString('vi-VN')} VND so với thuế suất trong nước.`);
  }

  return {
    domesticRate,
    domesticTax,
    treatyRate,
    treatyTax,
    savings,
    appliedRate,
    notes,
  };
}

/**
 * Lấy danh sách tài liệu cần thiết để áp dụng hiệp định
 */
export function getRequiredDocuments(countryCode: string): string[] {
  const treaty = getTreaty(countryCode);
  if (!treaty) {
    return ['Không có hiệp định thuế với quốc gia này.'];
  }

  return [
    'Giấy chứng nhận cư trú (Certificate of Residence) do cơ quan thuế nước ngoài cấp',
    'Hợp đồng hoặc chứng từ chứng minh nguồn thu nhập',
    'Xác nhận tư cách thụ hưởng thực sự (Beneficial Owner)',
    'Đơn đề nghị áp dụng hiệp định thuế theo mẫu',
    'Giấy tờ tùy thân (hộ chiếu)',
    'Các chứng từ liên quan khác theo yêu cầu cụ thể',
  ];
}

/**
 * Format số tiền theo chuẩn Việt Nam
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}
