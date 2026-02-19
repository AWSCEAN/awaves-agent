'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { authService } from '@/lib/apiServices';
import { getSavedLocale, saveLocale } from '@/lib/i18n';
import type { SurferLevel } from '@/types';

type Language = 'ko' | 'en';

const levelConfig = {
  beginner: {
    color: 'green',
    borderColor: 'border-green-400',
    bgColor: 'bg-green-50',
    selectedBg: 'bg-green-100',
    textColor: 'text-green-700',
    icon: '🌊',
  },
  intermediate: {
    color: 'orange',
    borderColor: 'border-orange-400',
    bgColor: 'bg-orange-50',
    selectedBg: 'bg-orange-100',
    textColor: 'text-orange-700',
    icon: '🏄',
  },
  advanced: {
    color: 'red',
    borderColor: 'border-red-400',
    bgColor: 'bg-red-50',
    selectedBg: 'bg-red-100',
    textColor: 'text-red-700',
    icon: '🔥',
  },
};

const translations = {
  ko: {
    title: '회원가입',
    step1Title: '계정 정보',
    step2Title: '서핑 레벨 선택',
    username: '사용자명',
    password: '비밀번호',
    confirmPassword: '비밀번호 확인',
    next: '다음',
    back: '이전',
    submit: '가입하기',
    hasAccount: '이미 계정이 있으신가요?',
    login: '로그인',
    passwordMismatch: '비밀번호가 일치하지 않습니다',
    usernameExists: '이미 존재하는 사용자명입니다',
    errorNetwork: '네트워크 오류가 발생했습니다',
    success: '가입 완료! 로그인해주세요.',
    consentRequired: '개인정보 처리방침에 동의해주세요',
    selectLevel: '서핑 레벨을 선택해주세요',
    privacyConsent: '개인정보 처리방침에 동의합니다',
    viewPolicy: '전문 보기',
    levels: {
      beginner: {
        title: '초급 (Beginner)',
        description: '서핑 입문자 또는 파도 위에 서기 어려운 분',
      },
      intermediate: {
        title: '중급 (Intermediate)',
        description: '보드 위 균형 유지 및 긴 라이딩 가능한 분',
      },
      advanced: {
        title: '고급 (Advanced)',
        description: '강한 파도와 다양한 기술 구사 가능한 분',
      },
    },
    privacyPolicyTitle: '개인정보 처리방침',
    privacyPolicyContent: `1. 수집하는 개인정보 항목
- 사용자명, 비밀번호, 서핑 레벨

2. 개인정보의 수집 및 이용 목적
- 서비스 제공 및 맞춤형 서핑 정보 제공

3. 개인정보의 보유 및 이용 기간
- 회원 탈퇴 시까지

4. 개인정보의 제3자 제공
- 원칙적으로 제3자에게 제공하지 않습니다.

5. 이용자의 권리
- 언제든지 개인정보의 열람, 정정, 삭제를 요청할 수 있습니다.`,
    close: '닫기',
  },
  en: {
    title: 'Register',
    step1Title: 'Account Information',
    step2Title: 'Select Surfing Level',
    username: 'Username',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    next: 'Next',
    back: 'Back',
    submit: 'Register',
    hasAccount: 'Already have an account?',
    login: 'Login',
    passwordMismatch: 'Passwords do not match',
    usernameExists: 'Username already exists',
    errorNetwork: 'Network error occurred',
    success: 'Registration complete! Please login.',
    consentRequired: 'Please agree to the privacy policy',
    selectLevel: 'Please select your surfing level',
    privacyConsent: 'I agree to the Privacy Policy',
    viewPolicy: 'View Policy',
    levels: {
      beginner: {
        title: 'Beginner',
        description: 'New to surfing or difficulty standing on waves',
      },
      intermediate: {
        title: 'Intermediate',
        description: 'Can maintain balance and perform long rides',
      },
      advanced: {
        title: 'Advanced',
        description: 'Can ride strong waves with various maneuvers',
      },
    },
    privacyPolicyTitle: 'Privacy Policy',
    privacyPolicyContent: `1. Personal Information Collected
- Username, Password, Surfing Level

2. Purpose of Collection and Use
- Service provision and personalized surfing information

3. Retention Period
- Until account deletion

4. Third-Party Disclosure
- We do not disclose personal information to third parties.

5. User Rights
- You can request access, correction, or deletion of your personal information at any time.`,
    close: 'Close',
  },
};

export default function RegisterPage() {
  const router = useRouter();
  const [lang, setLangState] = useState<Language>('en');
  const [step, setStep] = useState(1);

  useEffect(() => {
    setLangState(getSavedLocale());
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    saveLocale(newLang);
  };

  // Step 1 fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2 fields
  const [userLevel, setSurferLevel] = useState<SurferLevel | ''>('');
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [showPrivacyPopup, setShowPrivacyPopup] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const t = translations[lang];

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!userLevel) {
      setError(t.selectLevel);
      return;
    }

    if (!privacyConsent) {
      setError(t.consentRequired);
      return;
    }

    setIsLoading(true);

    const result = await authService.registerV2({
      username,
      password,
      confirm_password: confirmPassword,
      user_level: userLevel,
      privacy_consent_yn: privacyConsent,
    });

    if (result.success && result.data?.result === 'success') {
      setSuccess(t.success);
      setTimeout(() => router.push('/login'), 1500);
    } else {
      const errorCode = result.data?.error?.code;
      if (errorCode === 'USERNAME_EXISTS') {
        setError(t.usernameExists);
      } else if (errorCode === 'PASSWORD_MISMATCH') {
        setError(t.passwordMismatch);
      } else if (errorCode === 'CONSENT_REQUIRED') {
        setError(t.consentRequired);
      } else {
        setError(result.data?.error?.message || result.error || t.errorNetwork);
      }
      setIsLoading(false);
    }
  };

  const levelOptions: SurferLevel[] = ['beginner', 'intermediate', 'advanced'];

  return (
    <main className="min-h-screen bg-sand-gradient flex items-center justify-center px-4 py-8">
      <div className="flex flex-col md:flex-row items-center gap-8 md:gap-24 w-full max-w-3xl">
        <div className="hidden md:flex flex-shrink-0">
          <Link href="/">
            <Image
              src="/awaves_main.svg"
              alt="AWAVES"
              width={180}
              height={180}
              className="animate-ripple"
              style={{ width: 'auto', height: 'auto', maxWidth: '180px' }}
            />
          </Link>
        </div>
        <div className="flex md:hidden">
          <Link href="/">
            <Image
              src="/awaves_main.svg"
              alt="AWAVES"
              width={80}
              height={80}
              className="animate-ripple"
              style={{ width: 'auto', height: 'auto', maxWidth: '80px' }}
            />
          </Link>
        </div>

        <div className="w-full md:w-[480px] card">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-ocean-800">{t.title}</h1>
              <p className="text-sm text-ocean-600">
                {step === 1 ? t.step1Title : t.step2Title}
              </p>
            </div>
            <button
              onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}
              className="text-sm text-ocean-600 hover:text-ocean-500"
            >
              {lang === 'ko' ? 'EN' : '한국어'}
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center mb-6">
            <div className={`flex-1 h-2 rounded-l-full ${step >= 1 ? 'bg-ocean-500' : 'bg-ocean-200'}`} />
            <div className={`flex-1 h-2 rounded-r-full ${step >= 2 ? 'bg-ocean-500' : 'bg-ocean-200'}`} />
          </div>

          {step === 1 ? (
            <form onSubmit={handleNextStep} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ocean-700 mb-1">
                  {t.username}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field"
                  required
                  minLength={2}
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ocean-700 mb-1">
                  {t.password}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ocean-700 mb-1">
                  {t.confirmPassword}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              {error && (
                <p className="text-sunset-500 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                className="btn-primary w-full"
              >
                {t.next}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3">
                {levelOptions.map((level) => {
                  const config = levelConfig[level];
                  const isSelected = userLevel === level;

                  return (
                    <label
                      key={level}
                      className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? `${config.borderColor} ${config.selectedBg}`
                          : `border-gray-200 hover:${config.borderColor} ${config.bgColor}`
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Visible radio button */}
                        <input
                          type="radio"
                          name="userLevel"
                          value={level}
                          checked={isSelected}
                          onChange={(e) => setSurferLevel(e.target.value as SurferLevel)}
                          className={`w-5 h-5 flex-shrink-0 accent-current ${config.textColor}`}
                        />
                        {/* Level icon */}
                        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl ${config.bgColor} ${config.borderColor} border-2`}>
                          {config.icon}
                        </div>
                        {/* Level info */}
                        <div className="flex-1 min-w-0">
                          <div className={`font-semibold ${config.textColor} whitespace-nowrap`}>
                            {t.levels[level].title}
                          </div>
                          <div className="text-sm text-gray-600 mt-0.5">
                            {t.levels[level].description}
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-ocean-200">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="privacyConsent"
                    checked={privacyConsent}
                    onChange={(e) => setPrivacyConsent(e.target.checked)}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <label htmlFor="privacyConsent" className="text-sm text-ocean-700 cursor-pointer">
                      {t.privacyConsent}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPrivacyPopup(true)}
                      className="block text-xs text-ocean-500 hover:text-ocean-600 underline mt-1"
                    >
                      {t.viewPolicy}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-sunset-500 text-sm text-center">{error}</p>
              )}

              {success && (
                <p className="text-green-600 text-sm text-center">{success}</p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-2 px-4 border border-ocean-300 rounded-lg text-ocean-700 hover:bg-ocean-50"
                >
                  {t.back}
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  {isLoading ? '...' : t.submit}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-ocean-600">
            {t.hasAccount}{' '}
            <Link href="/login" className="text-ocean-500 hover:text-ocean-600 font-medium">
              {t.login}
            </Link>
          </div>
        </div>
      </div>

      {/* Privacy Policy Popup */}
      {showPrivacyPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-ocean-200">
              <h2 className="text-lg font-bold text-ocean-800">{t.privacyPolicyTitle}</h2>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <pre className="whitespace-pre-wrap text-sm text-ocean-700 font-sans">
                {t.privacyPolicyContent}
              </pre>
            </div>
            <div className="p-4 border-t border-ocean-200">
              <button
                onClick={() => setShowPrivacyPopup(false)}
                className="w-full btn-primary"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
