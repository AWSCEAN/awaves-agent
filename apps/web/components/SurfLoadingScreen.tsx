'use client';

export default function SurfLoadingScreen() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-sand-gradient overflow-hidden">
      {/* 3D Scene Container – scaled down on mobile so it fits small screens */}
      <div className="transform scale-[0.65] md:scale-100 origin-center">
      <div className="surf-scene">
        {/* Ocean waves behind */}
        <div className="surf-ocean">
          <div className="surf-wave surf-wave-1" />
          <div className="surf-wave surf-wave-2" />
          <div className="surf-wave surf-wave-3" />
        </div>

        {/* 3D Surfer Character */}
        <div className="surf-character">
          {/* Shadow on water */}
          <div className="surf-shadow" />

          {/* Surfboard with 3D tilt */}
          <div className="surf-board">
            <div className="surf-board-top" />
            <div className="surf-board-stripe" />
          </div>

          {/* Character body */}
          <div className="surf-body">
            {/* Head */}
            <div className="surf-head">
              <div className="surf-hair" />
              <div className="surf-face">
                <div className="surf-eye surf-eye-l" />
                <div className="surf-eye surf-eye-r" />
                <div className="surf-mouth" />
              </div>
            </div>
            {/* Torso */}
            <div className="surf-torso" />
            {/* Arms */}
            <div className="surf-arm surf-arm-l" />
            <div className="surf-arm surf-arm-r" />
            {/* Legs */}
            <div className="surf-leg surf-leg-l" />
            <div className="surf-leg surf-leg-r" />
          </div>
        </div>

        {/* Splash particles */}
        <div className="surf-splash">
          <div className="surf-drop" style={{ animationDelay: '0s' }} />
          <div className="surf-drop" style={{ animationDelay: '0.3s' }} />
          <div className="surf-drop" style={{ animationDelay: '0.6s' }} />
          <div className="surf-drop" style={{ animationDelay: '0.15s' }} />
          <div className="surf-drop" style={{ animationDelay: '0.45s' }} />
        </div>
      </div>
      </div>{/* end scale wrapper */}

      {/* Loading text */}
      <div className="text-center mt-8">
        <h2 className="text-xl font-semibold text-ocean-700 mb-2">Loading your waves...</h2>
        <div className="flex items-center justify-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-ocean-400 animate-loading-dot" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-ocean-500 animate-loading-dot" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-ocean-600 animate-loading-dot" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
