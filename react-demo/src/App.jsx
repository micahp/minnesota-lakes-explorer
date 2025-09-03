import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function DemoApp() {
  // Demo data - lakes with real names and coordinates
  const demoLakes = [
    { id: 'superior', name: 'Lake Superior', county: 'Cook/Lake', sizeAcres: 31700000, coords: [47.0, -87.0] },
    { id: 'minnetonka', name: 'Lake Minnetonka', county: 'Hennepin/Carver', sizeAcres: 14528, coords: [44.93333, -93.56667] },
    { id: 'vermilion', name: 'Lake Vermilion', county: 'St. Louis', sizeAcres: 39271, coords: [47.8791, -92.4633] },
    { id: 'leech', name: 'Leech Lake', county: 'Cass', sizeAcres: 102947, coords: [47.1558, -94.3899] },
    { id: 'mille-lacs', name: 'Mille Lacs Lake', county: 'Mille Lacs', sizeAcres: 132700, coords: [46.2333, -93.6333] },
    { id: 'winne', name: 'Lake Winnibigoshish', county: 'Itasca', sizeAcres: 67000, coords: [47.4333, -94.3833] },
    { id: 'rainy', name: 'Rainy Lake', county: 'Koochiching', sizeAcres: 345000, coords: [48.6167, -93.1167] },
  ];

  // Fish catch images for the gallery - unique per lake
  const lakeFishImages = {
    'superior': [
      '/fish-catch-pics/jim-hartje-12-lb-10-oz-walleye_orig.png',
      '/fish-catch-pics/jamie-cooper-zz9lnGb6b8g-unsplash.jpg'
    ],
    'minnetonka': [
      '/fish-catch-pics/images.jpeg',
      '/fish-catch-pics/download.gif'
    ],
    'vermilion': [
      '/fish-catch-pics/dogfish-e1686709838615.jpg',
      '/fish-catch-pics/attachment-fishfixed.webp'
    ],
    'leech': [
      '/fish-catch-pics/Nicole-Stone-Rainy-River-Walleye-1.jpeg'
    ],
    'mille-lacs': [],
    'winne': [],
    'rainy': []
  };

  // Debug: Log the lake images to console
  console.log('Lake fish images:', lakeFishImages);

  // State management
  const [lakes] = useState(demoLakes);
  const [selectedLake, setSelectedLake] = useState(demoLakes[0]);
  const [catches, setCatches] = useState({
    'superior': [
      { id: 1, angler: 'Superior Angler', species: 'Lake Trout', length: 28, verified: true, fishTokens: 224, timestamp: '2024-07-31T11:00:00Z' },
      { id: 2, angler: 'Coast Guard', species: 'Coho Salmon', length: 22, verified: true, fishTokens: 176, timestamp: '2024-07-31T10:30:00Z' },
    ],
    'minnetonka': [
      { id: 3, angler: 'Demo Angler', species: 'Largemouth Bass', length: 18, verified: true, fishTokens: 150, timestamp: '2024-07-31T10:00:00Z' },
      { id: 4, angler: 'Fishing Pro', species: 'Northern Pike', length: 32, verified: true, fishTokens: 200, timestamp: '2024-07-31T09:30:00Z' },
    ],
    'vermilion': [
      { id: 5, angler: 'Lake Master', species: 'Walleye', length: 24, verified: true, fishTokens: 180, timestamp: '2024-07-31T08:15:00Z' },
      { id: 7, angler: 'Vermilion Pro', species: 'Northern Pike', length: 38, verified: true, fishTokens: 304, timestamp: '2024-07-31T07:00:00Z' },
    ],
    'leech': [
      { id: 6, angler: 'Leech Legend', species: 'Muskellunge', length: 45, verified: true, fishTokens: 360, timestamp: '2024-07-31T07:45:00Z' },
    ],
    'mille-lacs': [],
    'winne': [],
    'rainy': []
  });
  const [ledger, setLedger] = useState([]);
  const [logging, setLogging] = useState(false);
  const [capturePreview, setCapturePreview] = useState(null);
  const [speciesInput, setSpeciesInput] = useState('Largemouth Bass');
  const [lengthInput, setLengthInput] = useState(16);
  const [verifyResult, setVerifyResult] = useState(null);
  const [fishTokens, setFishTokens] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [userUploadedPhotos, setUserUploadedPhotos] = useState({});

  // Get catches for selected lake
  const lakeCatches = catches[selectedLake.id] || [];

  function openLake(lake) {
    setSelectedLake(lake);
    setVerifyResult(null);
    setCapturePreview(null);
    setLogging(false);
  }

  function simulateVerification() {
    setVerifying(true);
    
    // Simulate AI verification process
    setTimeout(() => {
      const isSpeciesValid = ['bass', 'pike', 'walleye', 'perch', 'sunfish', 'crappie', 'muskellunge', 'trout'].some(
        valid => speciesInput.toLowerCase().includes(valid)
      );
      const isLengthValid = lengthInput >= 8 && lengthInput <= 50;
      
      const verified = isSpeciesValid && isLengthValid;
      setVerifyResult(verified ? 'verified' : 'flagged');
      setVerifying(false);
    }, 1500);
  }

  function writeProof() {
    if (verifyResult !== 'verified') return;

    const newCatch = {
      id: Date.now(),
      angler: 'Demo User',
      species: speciesInput,
      length: lengthInput,
      verified: true,
      fishTokens: Math.round(lengthInput * 8), // 8 tokens per inch
      timestamp: new Date().toISOString(),
      lakeId: selectedLake.id,
      lakeName: selectedLake.name
    };

    // Add to lake catches
    setCatches(prev => ({
      ...prev,
      [selectedLake.id]: [newCatch, ...(prev[selectedLake.id] || [])]
    }));

    // Add to ledger
    setLedger(prev => [newCatch, ...prev]);

    // Award FISH tokens
    setFishTokens(prev => prev + newCatch.fishTokens);

    // Save the uploaded photo to the lake's user photos
    if (capturePreview) {
      setUserUploadedPhotos(prev => ({
        ...prev,
        [selectedLake.id]: [...(prev[selectedLake.id] || []), capturePreview]
      }));
    }

    // Reset form
    setLogging(false);
    setCapturePreview(null);
    setVerifyResult(null);
    setSpeciesInput('Largemouth Bass');
    setLengthInput(16);
  }

  // Check if lake has Michelob branding
  const hasMichelobBranding = ['superior', 'minnetonka', 'vermilion', 'leech'].includes(selectedLake.id);

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header with FISH tokens */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-sky-800">Minnesota Lakes on Chain</h1>
            <p className="text-slate-600">Turning fishing activity into verified, public lake data</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-500">Demo User</div>
            <div className="text-2xl font-bold text-green-600">{fishTokens} FISH</div>
            <div className="text-xs text-slate-400">tokens earned</div>
          </div>
        </header>

        <main className="grid grid-cols-12 gap-8">
          {/* Left Column: Lake Explorer */}
          <section className="col-span-4 space-y-6">
            {/* Lake Selection */}
            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Lake Explorer</h2>
              <div className="space-y-3">
                {lakes.map((lake) => (
                  <motion.button
                    key={lake.id}
                    onClick={() => openLake(lake)}
                    whileHover={{ scale: 1.02 }}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                      selectedLake.id === lake.id 
                        ? 'border-sky-500 bg-sky-50' 
                        : 'border-slate-100 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-semibold text-sky-900">{lake.name}</div>
                    <div className="text-sm text-slate-600">{lake.county}</div>
                    <div className="text-xs text-slate-500">{lake.sizeAcres.toLocaleString()} acres</div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Ledger Proofs */}
            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <h3 className="text-lg font-semibold mb-4">Recent Proofs</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {ledger.length === 0 ? (
                  <div className="text-sm text-slate-400">No proofs written yet. Log a catch to see them here.</div>
                ) : (
                  ledger.map((proof) => (
                    <div key={proof.id} className="p-3 bg-slate-50 rounded-lg text-sm">
                      <div className="font-medium">{proof.species} ({proof.length}")</div>
                      <div className="text-slate-600">{proof.lakeName}</div>
                      <div className="text-xs text-slate-500">
                        {new Date(proof.timestamp).toLocaleTimeString()} • {proof.fishTokens} FISH
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Right Column: Lake Details & Actions */}
          <section className="col-span-8 space-y-6">
            {/* Lake Detail View */}
            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-semibold text-sky-900">{selectedLake.name}</h2>
                  <p className="text-slate-600">{selectedLake.county} • {selectedLake.sizeAcres.toLocaleString()} acres</p>
                  <p className="text-sm text-slate-500">Coordinates: {selectedLake.coords[0].toFixed(4)}, {selectedLake.coords[1].toFixed(4)}</p>
                </div>
                <div className="flex items-center space-x-4">
                  {/* Michelob Golden Light branding for specific lakes */}
                  {hasMichelobBranding && (
                    <div className="transform -rotate-12">
                      <a 
                        href="https://x.com/MichGoldenLight/status/1957523666243318141" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="cursor-pointer hover:scale-105 transition-transform"
                      >
                        <img 
                          src="/michelob golden light.png" 
                          alt="Michelob Golden Light" 
                          className="h-16 w-auto opacity-80 hover:opacity-100 transition-opacity"
                          onLoad={() => console.log('Michelob image loaded successfully')}
                          onError={(e) => console.error('Michelob image failed to load:', e)}
                        />
                      </a>
                    </div>
                  )}
                  <button 
                    onClick={() => setLogging(true)} 
                    className="px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-colors"
                  >
                    Log a Catch
                  </button>
                </div>
              </div>

              {/* Recent Catches */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Recent Catches</h3>
                <div className="space-y-2">
                  {lakeCatches.length === 0 ? (
                    <div className="text-sm text-slate-400">No catches logged for this lake yet. Be the first!</div>
                  ) : (
                    lakeCatches.slice(0, 5).map((catch_, index) => (
                      <div key={catch_.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center text-sky-600 font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{catch_.angler}</div>
                            <div className="text-sm text-slate-600">{catch_.species}, {catch_.length}"</div>
                            <div className="text-xs text-slate-500">
                              {new Date(catch_.timestamp).toLocaleDateString('en-US', { 
                                month: 'numeric', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xs px-2 py-1 rounded-full ${
                            catch_.verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {catch_.verified ? 'verified' : 'flagged'}
                          </div>
                          <div className="text-sm font-medium text-green-600">{catch_.fishTokens} FISH</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-sky-50 rounded-lg">
                  <div className="text-2xl font-bold text-sky-600">{lakeCatches.length}</div>
                  <div className="text-sm text-slate-600">Total Catches</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {lakeCatches.filter(c => c.verified).length}
                  </div>
                  <div className="text-sm text-slate-600">Verified</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.max(...lakeCatches.map(c => c.length), 0)}
                  </div>
                  <div className="text-sm text-slate-600">Largest Fish</div>
                </div>
              </div>

              {/* Fish Catch Gallery */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Fish Catch Gallery</h3>
                {(() => {
                  const staticImages = lakeFishImages[selectedLake.id] || [];
                  const userPhotos = userUploadedPhotos[selectedLake.id] || [];
                  const allImages = [...staticImages, ...userPhotos];
                  
                  if (allImages.length === 0) {
                    return (
                      <div className="text-center py-8 text-slate-400">
                        <p>No fish catch photos available for this lake yet.</p>
                        <p className="text-sm">Be the first to log a catch!</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {allImages.map((image, index) => (
                        <motion.div
                          key={`${selectedLake.id}-${index}-${typeof image === 'string' ? 'static' : 'user'}`}
                          whileHover={{ scale: 1.05 }}
                          className="relative group cursor-pointer"
                        >
                          <img 
                            src={image} 
                            alt={`Fish catch ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border-2 border-slate-200 group-hover:border-sky-300 transition-colors"
                            onLoad={() => console.log(`Image loaded: ${image}`)}
                            onError={(e) => console.error(`Image failed to load: ${image}`, e)}
                          />
                          {/* Fish species label on hover */}
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs font-medium text-center py-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            {typeof image === 'string' && image.includes('walleye') && 'Walleye'}
                            {typeof image === 'string' && image.includes('bass') && 'Bass'}
                            {typeof image === 'string' && image.includes('pike') && 'Pike'}
                            {typeof image === 'string' && image.includes('perch') && 'Perch'}
                            {typeof image === 'string' && image.includes('dogfish') && 'Dogfish'}
                            {typeof image === 'string' && image.includes('sunfish') && 'Sunfish'}
                            {typeof image === 'string' && image.includes('salmon') && 'Salmon'}
                            {typeof image === 'string' && image.includes('trout') && 'Trout'}
                            {typeof image === 'string' && image.includes('muskellunge') && 'Muskellunge'}
                            {typeof image === 'string' && !image.includes('walleye') && !image.includes('bass') && !image.includes('pike') && !image.includes('perch') && !image.includes('dogfish') && !image.includes('sunfish') && !image.includes('salmon') && !image.includes('trout') && !image.includes('muskellunge') && 'Fish'}
                            {typeof image !== 'string' && 'User Catch'}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Catch Logging Modal */}
            {logging && (
              <div className="bg-white p-6 rounded-2xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">Log a Catch</h3>
                  <button 
                    onClick={() => setLogging(false)} 
                    className="text-slate-500 hover:text-slate-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Photo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Fish Photo
                    </label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => setCapturePreview(reader.result);
                          reader.readAsDataURL(file);
                        }
                      }} 
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                    {capturePreview && (
                      <img 
                        src={capturePreview} 
                        alt="Fish preview" 
                        className="mt-2 w-full h-32 object-cover rounded-lg border"
                      />
                    )}
                  </div>

                  {/* Catch Details */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Species
                      </label>
                      <input 
                        type="text" 
                        value={speciesInput} 
                        onChange={(e) => setSpeciesInput(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg"
                        placeholder="e.g., Largemouth Bass"
                      />
                    </div>

      <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Length (inches)
                      </label>
                      <input 
                        type="number" 
                        value={lengthInput} 
                        onChange={(e) => setLengthInput(Number(e.target.value))}
                        className="w-full p-2 border border-slate-300 rounded-lg"
                        min="1" 
                        max="60"
                      />
                    </div>

                    <div className="space-y-2">
                      <button 
                        onClick={simulateVerification}
                        disabled={verifying || !capturePreview}
                        className="w-full px-4 py-2 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 disabled:opacity-50"
                      >
                        {verifying ? 'Verifying...' : 'Run AI Verification'}
                      </button>

                      {verifyResult && (
                        <div className={`p-3 rounded-lg text-center ${
                          verifyResult === 'verified' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {verifyResult === 'verified' ? '✅ Verified' : '⚠️ Flagged'}
      </div>
                      )}

                      {verifyResult === 'verified' && (
                        <button 
                          onClick={writeProof}
                          className="w-full px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700"
                        >
                          Write Proof to Ledger
        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </main>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-slate-400">
          Built for Minnedemo41 • Demo mode • Real-time updates
        </footer>
      </div>
    </div>
  );
}
