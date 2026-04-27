import React from 'react';
import './Landing.css';

export default function Landing({ onEnterApp }) {
  return (
    <div className="landing-container">
      {/* Background Video */}
      <video 
        className="landing-video-bg" 
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260228_065522_522e2295-ba22-457e-8fdb-fbcd68109c73.mp4" 
        autoPlay 
        loop 
        muted 
        playsInline
      />

      {/* Navigation — Glassmorphic */}
      <nav className="landing-nav">
        <a href="#" className="landing-logo" onClick={(e) => { e.preventDefault(); onEnterApp(); }}>
          <span className="landing-logo-dot"></span>
          InstaAuto
        </a>
        
        <div className="landing-nav-links">
          <a href="#">About</a>
          <a href="#">Works</a>
          <a href="#">Services</a>
          <a href="#">Testimonial</a>
          <a href="#" className="landing-nav-dashboard" onClick={(e) => { e.preventDefault(); onEnterApp(); }}>Dashboard</a>
        </div>
      </nav>

      {/* Hero Content */}
      <div className="landing-hero">
        <h1 className="landing-headline-line1">Platform that makes your</h1>
        <h2 className="landing-headline-line2">Instagram growth automated</h2>
        <p className="landing-subtext">Instagram automation for Influencers, Creators and Brands</p>

        <button className="landing-cta-secondary" onClick={onEnterApp}>
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 5v14l11-7z" />
          </svg>
          See How It Works
        </button>
      </div>
    </div>
  );
}
