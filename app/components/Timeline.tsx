import React from 'react';
import Image from 'next/image';
import { Heart, MessageCircle, Play, PenLine } from 'lucide-react';

// --- MOCK DATA ---
export type TimelineItemType = 'photo' | 'voice' | 'video' | 'text';

export interface TimelineItem {
  id: string;
  type: TimelineItemType;
  date: string;
  title: string;
  description?: string;
  mediaUrl?: string;
  duration?: string;
}

const mockData: TimelineItem[] = [
  {
    id: '1',
    type: 'photo',
    date: 'June 12, 2026',
    title: 'Summer Getaway',
    description: 'A beautiful afternoon spent exploring the hidden coves by the coast. The weather was absolutely perfect.',
    mediaUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
  },
  {
    id: '2',
    type: 'voice',
    date: 'July 04, 2026',
    title: 'Late Night Thoughts',
    duration: '0:45',
  },
  {
    id: '3',
    type: 'video',
    date: 'August 22, 2026',
    title: 'Concert Highlights',
    mediaUrl: 'https://images.unsplash.com/photo-1540039155733-d7696d54af58?w=800&q=80',
    duration: '1:20',
  },
  {
    id: '4',
    type: 'text',
    date: 'September 05, 2026',
    title: 'New Beginnings',
    description: "Today marked the start of something completely new. I'm feeling a mix of nerves and excitement, but mostly just grateful for this opportunity to grow and learn. Let's see where this journal takes us.",
  },
];

// --- COMPONENTS ---

const InteractionBar = () => (
  <div className="flex items-center gap-4 mt-4 pt-3 border-t border-black/10 text-black/60">
    <button className="flex items-center gap-1.5 hover:text-red-500 transition-colors">
      <Heart size={18} />
    </button>
    <button className="flex items-center gap-1.5 hover:text-blue-500 transition-colors">
      <MessageCircle size={18} />
    </button>
  </div>
);

const WaveformStub = () => (
  <div className="flex items-end gap-1 h-8 opacity-60">
    {[4, 8, 5, 10, 6, 12, 7, 4, 9, 5, 8, 3].map((height, i) => (
      <div key={i} className="w-1.5 bg-black/40 rounded-full" style={{ height: `${height * 10}%` }} />
    ))}
  </div>
);

export default function Timeline() {
  return (
    <div className="relative max-w-5xl mx-auto px-4 py-12 font-sans">
      
      {/* Central Dashed Line */}
      {/* Hidden on mobile (rendered on the left instead), visible on md+ */}
      <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px border-l-2 border-dashed border-gray-400/50 -translate-x-1/2" />

      <div className="space-y-16">
        {mockData.map((item, index) => {
          const isEven = index % 2 === 0;

          return (
            <div key={item.id} className="relative flex flex-col md:flex-row items-start md:items-center w-full">
              
              {/* Date Node (Mobile: left, Desktop: center) */}
              <div className="absolute left-8 md:left-1/2 top-0 md:top-1/2 -translate-x-1/2 md:-translate-y-1/2 z-10 flex items-center justify-center">
                <span className="bg-[#111] text-[#d4af37] border border-[#d4af37]/30 text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap shadow-md">
                  {item.date}
                </span>
              </div>

              {/* Connecting Line (Desktop only) */}
              <div className={`hidden md:block absolute top-1/2 w-8 border-t-2 border-dashed border-gray-400/50 ${isEven ? 'right-1/2 mr-4' : 'left-1/2 ml-4'}`} />

              {/* Card Container */}
              <div className={`w-full md:w-1/2 pl-16 md:pl-0 ${isEven ? 'md:pr-12' : 'md:pl-12 md:ml-auto'} mt-8 md:mt-0`}>
                
                {/* 
                  CARD VARIANTS 
                  Note: Using the requested light background colors. Text is forced to black/dark gray for readability against these light backgrounds. 
                */}
                
                {/* 1. PHOTO CARD */}
                {item.type === 'photo' && (
                  <div className="bg-white text-gray-900 rounded-2xl shadow-md overflow-hidden transition-transform hover:-translate-y-1">
                    <div className="relative w-full h-56 bg-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.mediaUrl} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
                      <InteractionBar />
                    </div>
                  </div>
                )}

                {/* 2. VOICE NOTE CARD */}
                {item.type === 'voice' && (
                  <div className="bg-pink-100 text-pink-950 rounded-2xl shadow-md p-5 transition-transform hover:-translate-y-1">
                    <h3 className="font-bold text-lg mb-4">{item.title}</h3>
                    <div className="flex items-center gap-4 bg-white/40 p-3 rounded-xl border border-pink-200/50">
                      <button className="w-10 h-10 shrink-0 bg-pink-500 text-white rounded-full flex items-center justify-center hover:bg-pink-600 transition-colors shadow-sm">
                        <Play size={18} className="ml-1" />
                      </button>
                      <div className="flex-1 overflow-hidden">
                        <WaveformStub />
                      </div>
                      <span className="text-xs font-semibold opacity-70">{item.duration}</span>
                    </div>
                  </div>
                )}

                {/* 3. VIDEO CARD */}
                {item.type === 'video' && (
                  <div className="bg-blue-50 text-blue-950 rounded-2xl shadow-md overflow-hidden transition-transform hover:-translate-y-1">
                    <div className="relative w-full h-56 bg-blue-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.mediaUrl} alt={item.title} className="w-full h-full object-cover" />
                      
                      {/* Central Play Icon Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="w-14 h-14 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/50 shadow-lg">
                          <Play size={24} className="ml-1" />
                        </div>
                      </div>

                      {/* Duration Pill */}
                      <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded-md backdrop-blur-sm">
                        {item.duration}
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                      <InteractionBar />
                    </div>
                  </div>
                )}

                {/* 4. TEXT / JOURNAL CARD */}
                {item.type === 'text' && (
                  <div className="bg-yellow-50 text-yellow-950 rounded-2xl shadow-md p-6 relative transition-transform hover:-translate-y-1 border border-yellow-100">
                    <div className="absolute top-4 right-4 text-yellow-600/50">
                      <PenLine size={20} />
                    </div>
                    <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                    <p className="text-xs text-yellow-700/70 font-medium mb-4 uppercase tracking-wider">{item.date}</p>
                    <p className="text-sm leading-relaxed text-yellow-900/80 font-serif italic">
                      "{item.description}"
                    </p>
                  </div>
                )}

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
