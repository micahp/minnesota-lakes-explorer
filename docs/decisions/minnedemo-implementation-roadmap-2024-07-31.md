# Minnedemo Implementation Roadmap

**Date:** 2024-07-31  
**Status:** Implementation Phase  
**Branch:** minnedemo

## Immediate Actions (This Week)

### 1. Fix Map Visual Filtering
**File:** `js/map.js`  
**Issue:** MIN_ACRES filter doesn't visually hide lakes  
**Solution:** Implement proper vector tile filtering or client-side hiding

```javascript
// In vectorTileLayerStyles.lakes function
if (typeof MIN_ACRES === 'number' && Number.isFinite(MIN_ACRES)) {
    if (properties.area_acres != null) {
        const area = Number(properties.area_acres);
        if (!Number.isNaN(area) && area < MIN_ACRES) {
            return hiddenStyle; // This should actually hide the feature
        }
    }
}
```

### 2. Create React Component Structure
**New Files to Create:**
- `react/components/LakeExplorer.jsx` - Main lake explorer component
- `react/components/LakeDetail.jsx` - Lake detail view with leaderboard
- `react/components/CatchLogger.jsx` - Catch logging modal
- `react/components/Leaderboard.jsx` - Real-time leaderboard
- `react/components/FishTokenDisplay.jsx` - FISH token balance and earning

**Files to Modify:**
- `react/App.jsx` - Main app structure
- `react/main.jsx` - Entry point

### 3. State Management Setup
**New File:** `react/hooks/useLakeData.js`  
**Purpose:** Custom hook for lake data management

```javascript
import { useState, useEffect } from 'react';

export function useLakeData() {
    const [lakes, setLakes] = useState([]);
    const [catches, setCatches] = useState({});
    const [fishTokens, setFishTokens] = useState(0);
    const [selectedLake, setSelectedLake] = useState(null);
    
    // Load existing DNR data
    useEffect(() => {
        // Load lakes.json and fish data
    }, []);
    
    return { lakes, catches, fishTokens, selectedLake, setSelectedLake };
}
```

## Week 1: Core Infrastructure

### 1. React Migration
**Goal:** Convert existing vanilla JS to React while maintaining functionality

**Steps:**
1. **Create LakeExplorer Component**
   - Port existing map functionality from `js/map.js`
   - Integrate with existing vector tiles
   - Maintain county and area filtering

2. **Create LakeDetail Component**
   - Display existing lake metadata
   - Add placeholder for leaderboard
   - Add placeholder for FISH tokens

3. **Integrate with Existing Data**
   - Load `data/lakes.json` in React
   - Load `data/fish_catch.json` for historical data
   - Maintain existing data structure

### 2. Real-time System Architecture
**Decision:** Start with polling for simplicity, upgrade to WebSocket later

**Implementation:**
```javascript
// react/hooks/useRealTimeUpdates.js
export function useRealTimeUpdates() {
    const [lastUpdate, setLastUpdate] = useState(Date.now());
    
    useEffect(() => {
        const interval = setInterval(() => {
            // Poll for updates every 5 seconds
            fetchUpdates();
        }, 5000);
        
        return () => clearInterval(interval);
    }, []);
}
```

## Week 2: Feature Integration

### 1. Catch Logging System
**Component:** `CatchLogger.jsx`

**Features:**
- Photo upload (drag & drop + file picker)
- Species/length input forms
- Mock AI verification
- Location verification (GPS check)
- Proof creation

**Mock AI Verification:**
```javascript
function simulateAIVerification(photo, species, length) {
    // Simple rules for demo
    const isSpeciesValid = ['bass', 'pike', 'walleye', 'perch'].some(
        valid => species.toLowerCase().includes(valid)
    );
    const isLengthValid = length >= 8 && length <= 50;
    
    return {
        verified: isSpeciesValid && isLengthValid,
        confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
        species: species,
        length: length
    };
}
```

### 2. Leaderboard System
**Component:** `Leaderboard.jsx`

**Features:**
- Real-time updates
- Top catches by species/length
- Verification status badges
- FISH token integration

**Data Structure:**
```javascript
const leaderboardData = {
    'lake-id': [
        {
            id: 'catch-1',
            angler: 'Angler 1',
            species: 'Largemouth Bass',
            length: 18,
            verified: true,
            fishTokens: 150,
            timestamp: '2024-07-31T12:00:00Z'
        }
    ]
};
```

### 3. FISH Token System
**Component:** `FishTokenDisplay.jsx`

**Features:**
- Token balance display
- Earning mechanics
- Achievement system

**Token Calculation:**
```javascript
function calculateFishTokens(catch) {
    let baseTokens = 100;
    
    // Bonus for verified catches
    if (catch.verified) baseTokens *= 1.5;
    
    // Bonus for large fish
    if (catch.length > 20) baseTokens += 50;
    
    // Bonus for rare species
    if (['muskie', 'lake trout'].includes(catch.species.toLowerCase())) {
        baseTokens += 100;
    }
    
    return Math.round(baseTokens);
}
```

## Week 3: Demo Polish

### 1. UI/UX Refinement
**Goals:**
- Consistent design language
- Smooth animations
- Mobile responsiveness
- Clear user flow

**Tools:**
- Framer Motion for animations
- Tailwind CSS for styling
- Responsive design patterns

### 2. Demo Flow Optimization
**User Journey:**
1. **Landing:** Show lake explorer with real DNR data
2. **Selection:** Pick a lake, show current state
3. **Action:** Log a catch, demonstrate AI verification
4. **Result:** Show real-time updates, FISH tokens
5. **Impact:** Demonstrate ecosystem value

### 3. Performance Optimization
**Goals:**
- Smooth 60fps animations
- Fast data loading
- Responsive interactions
- Reliable real-time updates

## File Modification Summary

### New Files to Create
```
react/
├── components/
│   ├── LakeExplorer.jsx
│   ├── LakeDetail.jsx
│   ├── CatchLogger.jsx
│   ├── Leaderboard.jsx
│   └── FishTokenDisplay.jsx
├── hooks/
│   ├── useLakeData.js
│   ├── useRealTimeUpdates.js
│   └── useFishTokens.js
└── utils/
    ├── aiVerification.js
    └── tokenCalculation.js
```

### Files to Modify
```
react/
├── App.jsx (major restructure)
├── main.jsx (entry point updates)
└── index.css (styling updates)

js/
├── map.js (fix filtering)
└── data-loader.js (React integration)
```

### Files to Keep (No Changes)
```
data/ (all existing data files)
css/ (existing styles)
js/ (core utilities)
```

## Integration Points

### 1. Data Flow
```
Existing DNR Data → React State → Real-time Updates → UI Components
```

### 2. Map Integration
```
Leaflet Map → React Component → State Management → Filtering
```

### 3. Real-time System
```
Catch Logging → State Update → Broadcast → UI Refresh
```

## Success Criteria

### Week 1
- [ ] React components created and rendering
- [ ] Existing map functionality preserved
- [ ] Data loading working in React

### Week 2
- [ ] Catch logging system functional
- [ ] Leaderboard displaying data
- [ ] FISH tokens calculating and displaying

### Week 3
- [ ] Smooth demo flow
- [ ] Performance optimized
- [ ] Ready for presentation

## Risk Mitigation

### Technical Risks
- **Map Integration Complexity:** Start with simple React wrapper, add features incrementally
- **Real-time System:** Use polling as fallback, implement WebSocket as enhancement
- **Performance Issues:** Monitor and optimize as we go

### Demo Risks
- **Feature Complexity:** Focus on core features, polish incrementally
- **Technical Issues:** Have fallback demos ready
- **Time Constraints:** Prioritize must-have features

## Next Immediate Actions

1. **Today:** Fix map visual filtering
2. **Tomorrow:** Create React component structure
3. **This Week:** Implement basic React integration
4. **Next Week:** Add catch logging and leaderboards
5. **Final Week:** Polish and testing
