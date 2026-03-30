import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FeedbackModal({ isOpen, onClose }) {
  const [rating, setRating] = useState(5);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.95, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 10 }}
          className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-6 shadow-2xl relative"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800/50 p-2 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h2 className="text-2xl font-black text-white mb-2">Give Feedback</h2>
          <p className="text-sm text-slate-400 mb-6">
            Help us improve FitForm AI by sharing your experience.
          </p>

          {/* INSTRUCTIONS: Replace 'your_email@example.com' in the action URL with the email where you want to receive feedback submissions. */}
          <form action="https://formsubmit.co/maazbhavnagri@gmail.com" method="POST" className="flex flex-col gap-4">
            
            {/* Optional redirect after success (disables captcha if you add your domain later) */}
            <input type="hidden" name="_captcha" value="false" />
            <input type="hidden" name="_subject" value="New Feedback for FitForm AI!" />

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Name (Optional)
              </label>
              <input
                type="text"
                name="name"
                placeholder="John Doe"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Email (Optional)
              </label>
              <input
                type="email"
                name="email"
                placeholder="john@example.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Rating
              </label>
              <div className="flex gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`text-2xl transition-transform hover:scale-110 ${
                      star <= rating ? 'text-amber-400' : 'text-slate-600'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <input type="hidden" name="rating" value={rating} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Your Feedback
              </label>
              <textarea
                name="message"
                required
                placeholder="What did you like? What can we improve?"
                rows={4}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              className="mt-4 w-full bg-gradient-to-r from-violet-600 to-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-violet-900/50 hover:scale-[1.02] transition-all"
            >
              Submit Feedback
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
