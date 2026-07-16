import React, { useState } from 'react';
import { 
  Trophy, 
  HelpCircle, 
  Check, 
  X, 
  Award, 
  RefreshCw, 
  ChevronRight, 
  Sparkles, 
  BookOpen, 
  Flame,
  Zap,
  CheckCircle2
} from 'lucide-react';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctIdx: number;
  explanation: string;
  category: 'Cooling Rates' | 'Warping Control' | 'Defect Physics' | 'Joint Geometries';
}

export const WeldQuiz: React.FC = () => {
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);
  const [streak, setStreak] = useState<number>(0);

  const questions: Question[] = [
    {
      id: 1,
      question: 'Which of the following parameter changes would effectively decrease the cooling rate (T8/5) of a carbon steel weld, thereby reducing Martensite embrittlement risk?',
      options: [
        'Decrease voltage and increase travel speed',
        'Increase current (amperage) and preheat the plates to 150°C',
        'Use thinner plates and increase travel speed',
        'Switch shielding gas from Argon to helium'
      ],
      correctIdx: 1,
      explanation: 'Slowing down the cooling rate is achieved by increasing total heat input (higher amperage or voltage) and increasing preheat temperature. Slow cooling limits martensitic shear transform and favors ductile pearlite/ferrite crystal matrices.',
      category: 'Cooling Rates'
    },
    {
      id: 2,
      question: 'To suppress heavy angular distortion (warping) in a single-V butt joint, which workshop restraint strategy is best practice?',
      options: [
        'Utilize flexible copper magnetic clamps to allow unrestrained sliding',
        'Pre-bend or preset the plates outward by 2-3° before starting the root pass',
        'Thoroughly saturate the groove with liquid solvents',
        'Increase the root gap opening to 8.0mm'
      ],
      correctIdx: 1,
      explanation: 'Presetting involves pre-bending plates in the direction opposite to predicted shrinkage. When weld metal contracts during solidification, it pulls the plates flat, matching target flatness tolerances without lock-in residual stresses.',
      category: 'Warping Control'
    },
    {
      id: 3,
      question: 'When progressing in one direction in a continuous butt weld, transverse contraction stresses can build up. Which welding sequence technique minimizes this distortion?',
      options: [
        'Continuous high-speed robotic welding',
        'Backstep and Skip Welding',
        'Weaving the electrode broadly',
        'Increasing the preheat temperature excessively'
      ],
      correctIdx: 1,
      explanation: 'Backstep welding involves making short welds in the opposite direction to the general progression. This prevents the cumulative build-up of transverse contraction stresses that cause severe longitudinal bowing or cracking.',
      category: 'Warping Control'
    },
    {
      id: 4,
      question: 'Why is a Double-V joint often preferred over a Single-V joint for thick plates regarding distortion control?',
      options: [
        'It requires less filler metal and allows for "Balanced Welding" to counteract contraction stresses',
        'It increases the amount of angular distortion purposefully',
        'It prevents the need for any root pass',
        'It looks more aesthetically pleasing'
      ],
      correctIdx: 0,
      explanation: 'In balanced welding on a Double-V joint, welding is performed alternately on both sides. The contraction stresses from one side counteract the contraction stresses from the opposite side, minimizing angular distortion.',
      category: 'Warping Control'
    },
    {
      id: 5,
      question: 'During SMAW (stick) welding of thick carbon steel plates, what is the primary metallurgical cause of cold cracking (delayed hydrogen-induced cracking)?',
      options: [
        'High oxygen bubbles nucleating in the solidified molten pool',
        'Combining a susceptible microstructure, high residual tensile stress, and diffusible hydrogen atoms',
        'Too low voltage causing poor electrode droplet arc detachment',
        'Excess carbon steel plate preheat temperature above 300°C'
      ],
      correctIdx: 1,
      explanation: 'Hydrogen-induced cracking (HIC) requires three concurrent criteria: a susceptible brittle microstructure (e.g., martensite), high residual tensile stresses locking the joint, and diffusible hydrogen (from moisture/flux residues) migrating to stress points.',
      category: 'Defect Physics'
    },
    {
      id: 6,
      question: 'When adjusting parameters, if you see high-voltage short-arc spray spatter, what gas combination is recommended to smoothen droplet transfer in GMAW (MIG)?',
      options: [
        '100% Carbon Dioxide (CO2)',
        'An Argon-rich mix (e.g. 75% Argon / 25% CO2) to induce spray/axial transfer',
        '100% Hydrogen gas',
        'Pure compressed dry air'
      ],
      correctIdx: 1,
      explanation: 'Argon gas has a lower ionization potential, which stabilizes a broad, fluid plasma arc. Increasing Argon content above 75% suppresses turbulent globular transfer, creating smooth spray-transfer droplets that eliminate spatter.',
      category: 'Defect Physics'
    },
    {
      id: 7,
      question: 'What does the AWS Code specify as the primary hazard of a weld edge "undercut"?',
      options: [
        'It increases the visual weight of the weldment',
        'It acts as a mechanical stress concentrator (notch effect) prone to fatigue cracking',
        'It causes the shielding gas to absorb excess nitrogen',
        'It prevents the slag from being easily chipped away'
      ],
      correctIdx: 1,
      explanation: 'An undercut is an eroded groove near the toe that reduces the base metal thickness locally. In dynamic load structures (like bridges or cranes), this sharp groove acts as a stress-raiser/notch, triggering early fatigue crack initiation.',
      category: 'Defect Physics'
    }
  ];

  const currentQuestion = questions[currentIdx];

  const handleOptionSelect = (idx: number) => {
    if (isSubmitted) return;
    setSelectedOpt(idx);
  };

  const handleSubmit = () => {
    if (selectedOpt === null || isSubmitted) return;

    setIsSubmitted(true);
    const isCorrect = selectedOpt === currentQuestion.correctIdx;

    if (isCorrect) {
      setScore(prev => prev + 1);
      setStreak(prev => prev + 1);
    } else {
      setStreak(0);
    }
  };

  const handleNext = () => {
    setSelectedOpt(null);
    setIsSubmitted(false);

    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  const handleReset = () => {
    setCurrentIdx(0);
    setSelectedOpt(null);
    setIsSubmitted(false);
    setScore(0);
    setQuizFinished(false);
    setStreak(0);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col h-full text-slate-100" id="weld-quiz-panel">
      
      {/* Title Header */}
      <div className="bg-slate-950 px-6 py-4 border-b border-slate-800/80 flex justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <div className="flex flex-col">
            <h2 className="font-display font-semibold text-base text-slate-100">
              AWS Metallurgy Certification Challenge
            </h2>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
              AWS D1.1 Code &amp; Defect Physics Testing
            </span>
          </div>
        </div>

        {streak > 1 && (
          <div className="bg-amber-500/10 text-amber-400 text-[10px] font-mono border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
            <Sparkles className="w-3 h-3 text-amber-500" />
            STREAK: {streak} 🔥
          </div>
        )}
      </div>

      {/* Main Container */}
      <div className="p-6 md:p-8 flex-1 flex flex-col justify-between min-h-[400px]">
        
        {!quizFinished ? (
          <div className="flex flex-col gap-6">
            
            {/* Progress bar */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs text-slate-500 font-mono">
                <span>QUESTION {currentIdx + 1} OF {questions.length}</span>
                <span>Category: <strong className="text-amber-400">{currentQuestion.category}</strong></span>
              </div>
              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-300" 
                  style={{ width: `${((currentIdx) / questions.length) * 100}%` }} 
                />
              </div>
            </div>

            {/* Question Text */}
            <h3 className="font-display font-bold text-sm sm:text-base text-slate-100 leading-relaxed">
              {currentQuestion.question}
            </h3>

            {/* Options list */}
            <div className="flex flex-col gap-2.5">
              {currentQuestion.options.map((opt, i) => {
                const isSelected = selectedOpt === i;
                const isCorrectAnswer = currentQuestion.correctIdx === i;
                
                let optStyle = 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/70 text-slate-300';
                if (isSelected && !isSubmitted) {
                  optStyle = 'bg-amber-500/10 border-amber-500/70 text-amber-400';
                } else if (isSubmitted) {
                  if (isCorrectAnswer) {
                    optStyle = 'bg-emerald-500/10 border-emerald-500/70 text-emerald-400';
                  } else if (isSelected) {
                    optStyle = 'bg-red-500/10 border-red-500/70 text-red-400';
                  } else {
                    optStyle = 'bg-slate-950/20 border-slate-900 text-slate-600 opacity-55';
                  }
                }

                return (
                  <button
                    key={i}
                    onClick={() => handleOptionSelect(i)}
                    disabled={isSubmitted}
                    className={`w-full text-left p-4 rounded-xl border text-xs font-medium leading-relaxed transition-all flex items-center justify-between gap-3 ${optStyle}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] font-bold font-mono text-slate-500 shrink-0">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span>{opt}</span>
                    </div>

                    {isSubmitted && isCorrectAnswer && (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    {isSubmitted && isSelected && !isCorrectAnswer && (
                      <X className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Submitted Feedback Explanation */}
            {isSubmitted && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start gap-2.5 animate-fadeIn">
                <BookOpen className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider font-bold">
                    Metallurgical Explanation:
                  </span>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    {currentQuestion.explanation}
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end mt-2">
              {!isSubmitted ? (
                <button
                  onClick={handleSubmit}
                  disabled={selectedOpt === null}
                  className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                    selectedOpt === null 
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                      : 'bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer shadow-md'
                  }`}
                >
                  Submit Answer
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md"
                >
                  {currentIdx === questions.length - 1 ? 'Finish Challenge' : 'Next Question'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

          </div>
        ) : (
          /* COMPLETION VIEW */
          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto py-6 gap-6">
            <div className="relative">
              <div className="w-24 h-24 bg-amber-500/10 rounded-full border-2 border-dashed border-amber-500/30 flex items-center justify-center">
                <Award className="w-12 h-12 text-amber-500 animate-bounce" />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-1 rounded-full border-2 border-slate-900">
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-bold text-white font-display">Challenge Completed!</h3>
              <p className="text-xs text-slate-400">AWS Welding Certification Simulation results are indexed.</p>
            </div>

            {/* Progress / Score Details */}
            <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Total Correct:</span>
                <span className="font-mono text-white font-bold">{score} / {questions.length}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Accuracy Percentage:</span>
                <span className="font-mono text-amber-400 font-bold">{Math.round((score / questions.length) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden mt-1">
                <div 
                  className="bg-amber-500 h-full rounded-full" 
                  style={{ width: `${(score / questions.length) * 100}%` }} 
                />
              </div>
            </div>

            {/* Certificate badge message */}
            {score >= questions.length - 1 ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-xs text-emerald-400 text-left leading-relaxed">
                🎉 <strong>Metallurgical Master Badge Unlocked!</strong> You demonstrated flawless comprehension of hydrogen diffusion, T8/5 cooling kinetics, and weld groove stress-raisers under standard D1.1 specifications.
              </div>
            ) : (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 text-left leading-relaxed">
                💡 <strong>Keep Learning:</strong> Continue to adjust current parameters, check cooling cycles, study defect limits in the Reference Gallery, and test your skills again!
              </div>
            )}

            <button
              onClick={handleReset}
              className="mt-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-2 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retake Quiz
            </button>
          </div>
        )}

      </div>

    </div>
  );
};
