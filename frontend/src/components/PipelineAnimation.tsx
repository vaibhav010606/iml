import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PipelineAnimation({ activeStage, previewData }: any) {
  if (!previewData || activeStage === -1) {
    return (
      <div className="flex items-center justify-center h-full w-full opacity-30">
        <motion.div animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}>
          <div className="w-24 h-24 border-2 border-dashed border-slate-700 rounded-full" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full w-full relative font-mono text-xs md:text-sm">
      <AnimatePresence mode="wait">
        {activeStage === 0 && (
          <motion.div key="stage0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4">
            <div className="text-slate-300 font-medium mb-4">Extracting Text Chunks...</div>
            <div className="grid grid-cols-4 gap-3">
              {[...Array(16)].map((_, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, scale: 0, y: -10 }} 
                  animate={{ opacity: 1, scale: 1, y: 0 }} 
                  transition={{ delay: i * 0.05, type: 'spring' }} 
                  className="w-10 h-2 bg-slate-700 rounded-full" 
                />
              ))}
            </div>
          </motion.div>
        )}
        
        {activeStage === 1 && (
          <motion.div key="stage1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4">
            <div className="text-slate-300 font-medium mb-4">Generating FP16 Vectors</div>
            <div className="grid grid-cols-5 gap-2 text-slate-400">
              {previewData.samples.raw_fp16.map((v: number, i: number) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: i * 0.1, type: 'spring' }} 
                  className="bg-slate-900 border border-slate-800 p-2 rounded text-center text-xs"
                >
                  {v.toFixed(3)}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeStage === 2 && (
          <motion.div key="stage2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4">
            <div className="text-slate-300 font-medium mb-4">PolarQuant (3-bit Binning)</div>
            <div className="flex gap-4 items-center">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }} className="w-12 h-12 border-2 border-slate-800 rounded-full border-t-slate-400 flex items-center justify-center">
                <span className="text-slate-500 text-[10px]">QR</span>
              </motion.div>
              <div className="text-slate-600">→</div>
              <div className="grid grid-cols-5 gap-2 text-slate-200">
                {previewData.samples.quantized_3bit.map((v: number, i: number) => (
                  <motion.div 
                    key={i} 
                    initial={{ scale: 1.5, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    transition={{ type: 'spring', delay: i * 0.1 }} 
                    className="bg-slate-800 border border-slate-700 p-2.5 rounded-lg font-bold text-sm flex items-center justify-center"
                  >
                    {v}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeStage === 3 && (
          <motion.div key="stage3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4">
            <div className="text-slate-300 font-medium mb-4">QJL Correction (1-bit Signs)</div>
            <div className="grid grid-cols-5 gap-2 text-slate-300">
              {previewData.samples.qjl_1bit.map((v: number, i: number) => (
                <motion.div 
                  key={i} 
                  initial={{ rotateX: -90, opacity: 0 }} 
                  animate={{ rotateX: 0, opacity: 1 }} 
                  transition={{ delay: i * 0.1, type: 'spring' }} 
                  className="bg-slate-900 border border-slate-700 w-10 h-10 flex items-center justify-center rounded-lg font-bold text-sm"
                >
                  {v > 0 ? '+1' : '-1'}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeStage === 4 && (
          <motion.div key="stage4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4">
            <div className="text-slate-300 font-medium mb-4">Packing 4-bit Dense Output</div>
            <div className="flex gap-2 text-slate-300">
              {previewData.samples.quantized_3bit.map((v: number, i: number) => {
                const qjl = previewData.samples.qjl_1bit[i];
                return (
                  <motion.div 
                    key={i} 
                    initial={{ y: -20, opacity: 0, scale: 0.9 }} 
                    animate={{ y: 0, opacity: 1, scale: 1 }} 
                    transition={{ delay: i * 0.1, type: 'spring' }} 
                    className="flex flex-col items-center bg-slate-900 p-2 rounded-lg border border-slate-800 relative overflow-hidden"
                  >
                    <span className="text-slate-300 font-bold text-sm z-10">{v}</span>
                    <span className="text-slate-600 text-[10px] my-1 z-10">⊕</span>
                    <span className="text-slate-400 font-medium text-xs z-10">{qjl > 0 ? '+' : '-'}</span>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
        
        {activeStage >= 5 && (
           <motion.div key="stage5" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }} className="flex flex-col items-center text-slate-300">
             <motion.div animate={{ rotate: [0, -5, 5, -5, 0] }} transition={{ delay: 0.5, duration: 0.5 }}>
               <svg className="w-16 h-16 mb-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </motion.div>
             <div className="text-xl font-semibold text-slate-200">Compression Complete</div>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
