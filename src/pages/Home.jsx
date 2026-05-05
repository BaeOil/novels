import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Search, Flame, Clock, Star, 
  ChevronRight, BookOpen, Sparkles, Image as ImageIcon,
  Eye, Gamepad2, PlayCircle, Compass, 
  Swords, Rocket, Ghost, Heart, ShieldAlert, Sparkle,
  Map, Plus, PenTool // เพิ่ม Icon สำหรับงานเขียน
} from 'lucide-react';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ทั้งหมด');

  const categories = [
    { name: 'ทั้งหมด', icon: <Compass size={18} /> },
    { name: 'แฟนตาซี', icon: <Sparkle size={18} /> },
    { name: 'ไซไฟ', icon: <Rocket size={18} /> },
    { name: 'สืบสวน', icon: <Eye size={18} /> },
    { name: 'โรแมนติก', icon: <Heart size={18} /> },
    { name: 'สยองขวัญ', icon: <Ghost size={18} /> },
    { name: 'เอาชีวิตรอด', icon: <ShieldAlert size={18} /> }
  ];

  const featuredBook = {
    id: 'f1',
    title: 'มหาสงครามข้ามจักรวาล: The Cosmic War',
    author: 'StarWeaver',
    synopsis: 'เมื่อจักรวาลถูกคุกคามด้วยพลังลึกลับจากมิติที่ 5 คุณคือผู้บัญชาการยานรบคนสุดท้ายที่จะกำหนดชะตากรรมของกาแล็กซี...',
    tags: ['ไซไฟ', 'เลือกทางเดิน', 'อวกาศ'],
    image: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=2000&auto=format&fit=crop',
    coverColor: 'from-pink-900/80 via-rose-900/60 to-transparent'
  };

  const trendingBooks = [
    { id: 't1', title: 'จอมเวทฝึกหัด', author: 'MagicPen', rating: 4.9, views: '128k', 
      image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=500&auto=format&fit=crop' },
    { id: 't2', title: 'หนีตายเกาะมรณะ', author: 'DarkShadow', rating: 4.7, views: '84k', 
      image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=500&auto=format&fit=crop' },
    { id: 't3', title: 'ระบบสุ่มรัก', author: 'PinkyPromise', rating: 4.8, views: '215k', 
      image: 'https://images.unsplash.com/photo-1518621736915-f3b8c41bfd00?q=80&w=500&auto=format&fit=crop' },
  ];

  const newUpdates = [
    { id: 'n1', title: 'คฤหาสน์ซ่อนวิญญาณ', author: 'GhostWriter', chapter: 'ปลดล็อค: รูทห้องใต้ดิน', time: '10 นาทีที่แล้ว' },
    { id: 'n2', title: 'เกิดใหม่เป็นสไลม์', author: 'SlimeLover', chapter: 'ปลดล็อค: เส้นทางวิวัฒนาการ', time: '1 ชั่วโมงที่แล้ว' },
    { id: 'n3', title: 'นักสืบแห่งไทม์ไลน์', author: 'ChronoDetect', chapter: 'อัปเดต: เบาะแสที่ 3', time: '3 ชั่วโมงที่แล้ว' },
  ];

  return (
    <div className="relative min-h-screen w-full bg-[#FCF5F7] font-sans text-rose-950 pb-24 overflow-x-hidden">
      
      {/* 🌸 Ambient Background Glow */}
      <div className="absolute top-0 left-0 w-full h-[500px] pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-pink-300/30 rounded-full blur-[100px] mix-blend-multiply" />
        <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] bg-fuchsia-200/40 rounded-full blur-[120px] mix-blend-multiply" />
      </div>

      {/* 🚀 Top Navigation */}
      <div className="sticky top-4 z-50 mx-4 md:mx-10 rounded-full bg-white/70 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(236,72,153,0.08)] px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-500 tracking-tighter flex items-center gap-2 shrink-0">
          <Gamepad2 size={28} className="text-pink-500" />
          STORYCHOICE
        </div>
        
        <div className="relative w-full md:w-[300px]">
          <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-pink-300" />
          <input 
            type="text" placeholder="ค้นหา..." 
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-2 bg-white/60 border border-pink-100 rounded-full outline-none text-sm shadow-inner"
          />
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {/* ✨ ปุ่มนำทางไปหน้าสร้างนิยาย (Navbar) */}
          <Link to="/create-novel" className="hidden sm:flex items-center gap-2 bg-rose-50 text-rose-500 hover:bg-rose-100 px-5 py-2 rounded-full text-sm font-bold transition-all border border-rose-200">
            <PenTool size={16} />
            เขียนนิยาย
          </Link>
          
          <div className="h-8 w-[1px] bg-pink-100 mx-2 hidden sm:block"></div>

          <Link to="/login" className="text-sm font-bold text-rose-400 hover:text-pink-600 px-4 py-2 rounded-full">
            เข้าสู่ระบบ
          </Link>
          <Link to="/register" className="bg-gradient-to-r from-pink-500 to-rose-400 text-white px-6 py-2 rounded-full text-sm font-bold hover:scale-105 transition-transform shadow-lg border border-pink-400/50">
            สร้างแอคเคานต์
          </Link>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto p-4 md:p-8 space-y-10 mt-4">
        
        {/* 🎮 1. Hero Section (เหมือนเดิม) */}
        <Link to="/story" className="block group">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full rounded-[2.5rem] overflow-hidden shadow-2xl border-2 border-white min-h-[400px] flex items-center cursor-pointer">
            <img src={featuredBook.image} alt="cover" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
            <div className={`absolute inset-0 bg-gradient-to-r ${featuredBook.coverColor}`}></div>
            <div className="relative p-8 md:p-16 text-white z-10">
              <span className="bg-pink-500/80 backdrop-blur-md px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-pink-400/50 inline-flex items-center gap-2 mb-4">
                <Sparkles size={12} /> Editor's Choice
              </span>
              <h1 className="text-3xl md:text-5xl font-bold mb-4 drop-shadow-lg">{featuredBook.title}</h1>
              <div className="bg-white text-pink-600 px-8 py-3 rounded-full text-sm font-black w-max flex items-center gap-2 group-hover:-translate-y-1 transition-all">
                <PlayCircle size={20} /> เริ่มผจญภัย
              </div>
            </div>
          </motion.div>
        </Link>

        {/* Layout หลัก */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start w-full">
          
          {/* 🏷️ 2. เมนูหมวดหมู่ + ปุ่มสร้างนิยายแบบ Game Style */}
          <div className="hidden lg:block lg:col-span-1 space-y-6 sticky top-28">
            
            {/* 🆕 ปุ่มสร้างโปรเจกต์ใหม่ (Sidebar) */}
            <div className="bg-gradient-to-br from-rose-600 to-pink-500 p-1 rounded-[2rem] shadow-xl">
              <Link to="/create-novel" className="flex flex-col items-center justify-center gap-3 bg-slate-900 rounded-[1.8rem] py-8 px-4 hover:bg-slate-800 transition-colors group">
                <div className="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center text-white shadow-[0_0_15px_rgba(236,72,153,0.5)] group-hover:scale-110 transition-transform">
                  <Plus size={28} />
                </div>
                <div className="text-center">
                  <h3 className="text-white font-black text-sm tracking-widest">NEW PROJECT</h3>
                  <p className="text-pink-300 text-[10px] font-bold mt-1 uppercase">Initialize Engine</p>
                </div>
              </Link>
            </div>

            <h2 className="text-xl font-black text-rose-900 flex items-center gap-2 px-2">
              <div className="p-1.5 bg-pink-100 rounded-lg text-pink-500"><Compass size={18} /></div>
              เลือกเส้นทาง
            </h2>
            <div className="flex flex-col gap-2">
              {categories.map(cat => (
                <button 
                  key={cat.name}
                  onClick={() => setActiveCategory(cat.name)}
                  className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all border-2 w-full text-left
                    ${activeCategory === cat.name 
                      ? 'bg-gradient-to-r from-pink-500 to-rose-400 border-transparent text-white shadow-md translate-x-2' 
                      : 'bg-white/60 text-rose-400 border-white hover:border-pink-300 shadow-sm'
                    }`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* 📚 3. กำลังมาแรง (เหมือนเดิม) */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-black text-rose-900 flex items-center gap-2 px-2">
              <div className="p-1.5 bg-pink-100 rounded-lg text-pink-500"><Flame size={20} /></div>
              แรงค์สูงสุด
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {trendingBooks.map((book, idx) => (
                <Link to="/story" key={book.id} className="bg-white/80 backdrop-blur-lg rounded-[2rem] p-3 border-2 border-white shadow-sm hover:-translate-y-1.5 transition-all group">
                  <div className="w-full aspect-[4/5] rounded-[1.5rem] mb-4 overflow-hidden">
                    <img src={book.image} alt={book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  </div>
                  <h3 className="font-bold text-rose-950 px-2 group-hover:text-pink-600 transition-colors">{book.title}</h3>
                  <div className="flex justify-between px-3 mt-4 bg-pink-50 rounded-xl py-2">
                    <span className="flex items-center gap-1 text-xs font-black text-amber-500"><Star size={12} className="fill-amber-400"/> {book.rating}</span>
                    <span className="flex items-center gap-1 text-xs font-bold text-rose-300"><Eye size={12}/> {book.views}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* 📜 4. กระดานภารกิจใหม่ (เหมือนเดิม) */}
          <div className="lg:col-span-1 space-y-6">
            <h2 className="text-xl font-black text-rose-900 flex items-center gap-2 px-2">
              <div className="p-1.5 bg-fuchsia-100 rounded-lg text-fuchsia-500"><Map size={20} /></div>
              ภารกิจใหม่
            </h2>
            <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-5 border-2 border-white shadow-sm flex flex-col gap-3">
              {newUpdates.map((update) => (
                <div key={update.id} className="group cursor-pointer flex items-center gap-3 bg-pink-50/50 hover:bg-pink-100/50 p-2.5 rounded-2xl transition-all">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                    <BookOpen size={18} className="text-pink-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-rose-900 truncate">{update.title}</h3>
                    <p className="text-[11px] font-bold text-pink-500 truncate mt-0.5">{update.chapter}</p>
                    <p className="text-[9px] font-medium text-rose-300 flex items-center gap-1 mt-1"><Clock size={8}/> {update.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}