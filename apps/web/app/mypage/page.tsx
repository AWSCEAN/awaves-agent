'use client';

import { useState } from 'react';
import Link from 'next/link';
import AwavesLogo from '@/components/AwavesLogo';

type Language = 'ko' | 'en';

const translations = {
  ko: {
    title: '마이페이지',
    profile: '프로필',
    email: '이메일',
    nickname: '닉네임',
    language: '선호 언어',
    korean: '한국어',
    english: 'English',
    save: '저장',
    logout: '로그아웃',
    savedSpots: '저장된 스팟',
    map: '지도',
    feedback: '피드백 보내기',
    feedbackPlaceholder: '의견이나 개선 사항을 알려주세요...',
    send: '보내기',
    feedbackSuccess: '피드백이 전송되었습니다. 감사합니다!',
  },
  en: {
    title: 'My Page',
    profile: 'Profile',
    email: 'Email',
    nickname: 'Nickname',
    language: 'Preferred Language',
    korean: '한국어',
    english: 'English',
    save: 'Save',
    logout: 'Logout',
    savedSpots: 'Saved Spots',
    map: 'Map',
    feedback: 'Send Feedback',
    feedbackPlaceholder: 'Share your thoughts or suggestions...',
    send: 'Send',
    feedbackSuccess: 'Feedback sent. Thank you!',
  },
};

export default function MyPage() {
  const [lang, setLang] = useState<Language>('en');
  const [nickname, setNickname] = useState('Surfer123');
  const [preferredLang, setPreferredLang] = useState<Language>('en');
  const [feedback, setFeedback] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const t = translations[lang];

  // Mock user data
  const user = {
    email: 'surfer@example.com',
  };

  const handleSaveProfile = () => {
    // TODO: Implement profile save
    console.log('Save profile:', { nickname, preferredLang });
  };

  const handleSendFeedback = () => {
    if (!feedback.trim()) return;
    // TODO: Implement feedback submission
    console.log('Send feedback:', feedback);
    setFeedback('');
    setFeedbackSent(true);
    setTimeout(() => setFeedbackSent(false), 3000);
  };

  const handleLogout = () => {
    // TODO: Implement logout
    console.log('Logout');
  };

  return (
    <div className="min-h-screen bg-sand-gradient">
      {/* Header */}
      <header className="glass sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <Link href="/">
          <AwavesLogo size="sm" />
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/map" className="text-ocean-700 hover:text-ocean-500 text-sm font-medium">
            {t.map}
          </Link>
          <Link href="/saved" className="text-ocean-700 hover:text-ocean-500 text-sm font-medium">
            {t.savedSpots}
          </Link>
          <button
            onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}
            className="text-sm text-ocean-600 hover:text-ocean-500"
          >
            {lang === 'ko' ? 'EN' : '한국어'}
          </button>
        </nav>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-ocean-800 mb-8">{t.title}</h1>

        {/* Profile Section */}
        <section className="card mb-8">
          <h2 className="text-xl font-semibold text-ocean-800 mb-4">{t.profile}</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ocean-700 mb-1">
                {t.email}
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="input-field bg-sand-100 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ocean-700 mb-1">
                {t.nickname}
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ocean-700 mb-1">
                {t.language}
              </label>
              <select
                value={preferredLang}
                onChange={(e) => setPreferredLang(e.target.value as Language)}
                className="input-field"
              >
                <option value="ko">{t.korean}</option>
                <option value="en">{t.english}</option>
              </select>
            </div>

            <div className="flex gap-4 pt-4">
              <button onClick={handleSaveProfile} className="btn-primary">
                {t.save}
              </button>
              <button onClick={handleLogout} className="btn-outline">
                {t.logout}
              </button>
            </div>
          </div>
        </section>

        {/* Feedback Section */}
        <section className="card">
          <h2 className="text-xl font-semibold text-ocean-800 mb-4">{t.feedback}</h2>

          <div className="space-y-4">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={t.feedbackPlaceholder}
              rows={4}
              className="input-field resize-none"
            />

            {feedbackSent && (
              <p className="text-green-600 text-sm">{t.feedbackSuccess}</p>
            )}

            <button
              onClick={handleSendFeedback}
              disabled={!feedback.trim()}
              className="btn-primary disabled:opacity-50"
            >
              {t.send}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
