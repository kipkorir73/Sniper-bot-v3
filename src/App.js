import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [ticks, setTicks] = useState({});
  const [clusters, setClusters] = useState({});
  const [sniperAlerts, setSniperAlerts] = useState({});
  const [clusterThreshold, setClusterThreshold] = useState(3);
  const markets = ['R_10', 'R_25', 'R_50', 'R_75', 'R_100'];

  useEffect(() => {
    const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.tick) {
        const market = data.tick.symbol;
        const tick = data.tick.quote;
        const digit = tick.toString().slice(-1);

        if (!ticks[market]) {
          setTicks((prevTicks) => ({ ...prevTicks, [market]: [] }));
        }

        setTicks((prevTicks) => ({
          ...prevTicks,
          [market]: [...prevTicks[market], digit].slice(-30),
        }));
      }
    };

    markets.forEach((market) => {
      ws.send(JSON.stringify({ ticks: market }));
    });

    return () => ws.close();
  }, []);

  useEffect(() => {
    markets.forEach((market) => {
      if (ticks[market]) {
        const clusters = detectClusters(ticks[market]);
        setClusters((prevClusters) => ({ ...prevClusters, [market]: clusters }));

        const clusterCounts = countClusters(clusters);
        Object.keys(clusterCounts).forEach((digit) => {
          if (clusterCounts[digit] >= clusterThreshold) {
            setSniperAlerts((prevAlerts) => ({
              ...prevAlerts,
              [market]: { digit, count: clusterCounts[digit] },
            }));
          }
        });
      }
    });
  }, [ticks, clusterThreshold]);

  function detectClusters(digits) {
    const clusters = [];
    let currentCluster = [];

    digits.forEach((digit) => {
      if (currentCluster.length === 0 || currentCluster[0] === digit) {
        currentCluster.push(digit);
      } else {
        if (currentCluster.length >= 2) {
          clusters.push(currentCluster);
        }
        currentCluster = [digit];
      }
    });

    if (currentCluster.length >= 2) {
      clusters.push(currentCluster);
    }

    return clusters;
  }

  function countClusters(clusters) {
    const clusterCounts = {};

    clusters.forEach((cluster) => {
      const digit = cluster[0];
      if (!clusterCounts[digit]) {
        clusterCounts[digit] = 0;
      }
      clusterCounts[digit]++;
    });

    return clusterCounts;
  }

  return (
    <div>
      <h1>Deriv Digit Sniper</h1>
      <select value={clusterThreshold} onChange={(e) => setClusterThreshold(Number(e.target.value))}>
        <option value="3">3 clusters</option>
        <option value="4">4 clusters</option>
        <option value="5">5 clusters</option>
      </select>
      {markets.map((market) => (
        <div key={market}>
          <h2>{market}</h2>
          <ul>
            {ticks[market]?.map((tick, index) => (
              <li key={index}>{tick}</li>
            ))}
          </ul>
          {sniperAlerts[market] && (
            <p>
              Sniper Alert: Digit {sniperAlerts[market].digit} formed {sniperAlerts[market].count} clusters!
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export default App;
