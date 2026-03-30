import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import FeedbackModal from '../components/FeedbackModal.jsx';

export default function Landing() {
  const navigate = useNavigate();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0b14] flex flex-col text-slate-300" style={{ fontFamily: 'Inter, sans-serif' }}>
      
      {/* ── Navbar ──────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60 sticky top-0 bg-[#0a0b14]/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">
            FitForm <span className="text-violet-400">AI</span>
          </span>
        </div>
        <button
          onClick={() => setFeedbackOpen(true)}
          className="text-xs font-semibold px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors shadow-lg"
        >
          Give Feedback
        </button>
      </header>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center">
        
        {/* Hero Section */}
        <section className="w-full max-w-5xl px-6 py-20 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center"
          >
            <h1 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight tracking-tight">
              Real-Time Exercise <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400">Form Analyzer</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10">
              Check your pushup and squat form instantly using advanced AI. No equipment needed, just your device's camera.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/workout')}
              className="px-10 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-bold text-lg shadow-xl shadow-violet-900/40 hover:shadow-violet-900/60 transition-all flex items-center gap-3"
            >
              Start Analysis
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </motion.button>
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="w-full max-w-5xl px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: 'Real-time feedback',
              desc: 'Get immediate visual and audio cues on your rep depth and full range of motion.',
              icon: '⚡'
            },
            {
              title: 'AI posture correction',
              desc: 'Our latest AI model tracks your body joints to warn you if your back curves or knees bend poorly.',
              icon: '🤖'
            },
            {
              title: 'Works on mobile & desktop',
              desc: 'Fully responsive and engineered to run directly in your browser on any modern device.',
              icon: '📱'
            }
          ].map((feat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-slate-800/40 border border-slate-700/50 p-8 rounded-3xl"
            >
              <div className="text-4xl mb-4">{feat.icon}</div>
              <h3 className="text-xl font-bold text-white mb-3">{feat.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </section>

        {/* How It Works */}
        <section className="w-full bg-slate-900/50 py-20 px-6 border-y border-slate-800">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">How It Works</h2>
            <p className="text-slate-400">Three simple steps to perfect your form.</p>
          </div>
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center relative">
            {/* Desktop connecting lines */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-slate-800 z-0"></div>

            {[
              { step: '1', title: 'Open camera', desc: 'Securely enable your device camera right from the browser. No app download needed.' },
              { step: '2', title: 'Perform exercise', desc: 'Stand back so your full body is in frame, and begin your push-ups or squats.' },
              { step: '3', title: 'Get instant feedback', desc: 'FitForm AI counts your reps properly and guides your posture dynamically.' },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center relative z-10">
                <div className="w-16 h-16 rounded-full bg-slate-800 border-4 border-[#0a0b14] flex items-center justify-center text-xl font-black text-violet-400 mb-6 shadow-xl">
                  {s.step}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                <p className="text-slate-400 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Supported Exercises */}
        <section className="w-full max-w-5xl px-6 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-12">Supported Exercises</h2>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <div className="bg-slate-800/30 border border-slate-700/40 p-8 rounded-3xl flex-1 flex flex-col items-center">
              <div className="w-20 h-20 bg-slate-200 rounded-2xl flex items-center justify-center mb-6 shadow-xl p-4 transition-transform hover:scale-105">
                <img src="/images/pushup_icon.png" alt="Push-ups" className="w-full h-full object-contain drop-shadow-sm" />
              </div>
              <h3 className="text-2xl font-bold text-white">Push-ups</h3>
            </div>
            <div className="bg-slate-800/30 border border-slate-700/40 p-8 rounded-3xl flex-1 flex flex-col items-center">
              <div className="w-20 h-20 bg-slate-200 rounded-2xl flex items-center justify-center mb-6 shadow-xl p-4 transition-transform hover:scale-105">
                <img src="/images/squat_icon.png" alt="Squats" className="w-full h-full object-contain drop-shadow-sm" />
              </div>
              <h3 className="text-2xl font-bold text-white">Squats</h3>
            </div>
          </div>
        </section>
        {/* Upcoming Exercises */}
        <section className="w-full max-w-5xl px-6 pb-20 pt-10 text-center">
          <div className="flex items-center justify-center gap-4 mb-12">
            <div className="flex-1 h-px bg-slate-800"></div>
            <h2 className="text-2xl font-black text-slate-400 uppercase tracking-widest px-4">Coming Soon</h2>
            <div className="flex-1 h-px bg-slate-800"></div>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <div className="bg-slate-800/20 border border-slate-800 p-8 rounded-3xl flex-1 flex flex-col items-center opacity-80 backdrop-blur-sm shadow-inner group transition-all hover:bg-slate-800/40">
              <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mb-5 shadow-lg p-3 group-hover:scale-110 transition-transform">
                <img src="/images/deadlift_icon.png" alt="Deadlifts" className="w-full h-full object-contain opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="text-xl font-bold text-slate-400">Deadlifts</h3>
            </div>
            <div className="bg-slate-800/20 border border-slate-800 p-8 rounded-3xl flex-1 flex flex-col items-center opacity-80 backdrop-blur-sm shadow-inner group transition-all hover:bg-slate-800/40">
              <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mb-5 shadow-lg p-3 group-hover:scale-110 transition-transform">
                <img src="/images/pullup_icon.png" alt="Pull-ups" className="w-full h-full object-contain opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="text-xl font-bold text-slate-400">Pull-ups</h3>
            </div>
            <div className="bg-slate-800/20 border border-slate-800 p-8 rounded-3xl flex-1 flex flex-col items-center opacity-80 backdrop-blur-sm shadow-inner group transition-all hover:bg-slate-800/40">
              <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mb-5 shadow-lg p-3 group-hover:scale-110 transition-transform">
                <img src="/images/plank_icon.png" alt="Planks" className="w-full h-full object-contain opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="text-xl font-bold text-slate-400">Planks</h3>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="w-full border-t border-slate-800 py-8 px-6 mt-auto">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm font-medium">Built by <span className="text-slate-300">Maaz Bhavnagri</span></p>
          <div className="flex gap-4">
            <a href="mailto:maazbhavnagri@gmail.com" className="text-slate-500 hover:text-white transition-colors">
              Email
            </a>
            <a href="https://www.linkedin.com/in/maaz-bhavnagri-102a03325/" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-blue-400 transition-colors">
              LinkedIn
            </a>
            <a href="https://github.com/MaazBhavnagri" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-white transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}
