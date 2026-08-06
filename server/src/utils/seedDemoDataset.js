const path = require('path');
const fs = require('fs');
const readline = require('readline');
const Dataset = require('../models/Dataset');
const TrafficRecord = require('../models/TrafficRecord');
const AnomalyResult = require('../models/AnomalyResult');
const User = require('../models/User');

const INLINE_DEMO_CSV = `timestamp,src_ip,dst_ip,protocol,packet_size,duration,tcp_flags,byte_rate,connection_state,label,attack_cat,src_bytes,dst_bytes,flow_duration,protocol_type
2026-08-01T00:00:00Z,192.168.1.10,10.0.0.5,tcp,512,0.12,SYN,4266.67,established,normal,none,512,1024,120000,tcp
2026-08-01T00:01:00Z,192.168.1.11,10.0.0.5,tcp,1280,0.45,ACK,2844.44,established,normal,none,1280,4096,450000,tcp
2026-08-01T00:02:00Z,192.168.1.12,10.0.0.8,udp,128,0.02,NONE,6400.00,closed,normal,none,128,128,20000,udp
2026-08-01T00:03:00Z,192.168.1.13,10.0.0.12,icmp,64,0.01,NONE,6400.00,closed,normal,none,64,64,10000,icmp
2026-08-01T00:04:00Z,10.0.0.99,10.0.0.5,tcp,9800,0.01,SYN-ACK,980000.00,syn_sent,anomaly,DoS Hulk,9800,0,10000,tcp
2026-08-01T00:05:00Z,10.0.0.99,10.0.0.5,tcp,10240,0.01,SYN,1024000.00,syn_sent,anomaly,DoS Hulk,10240,0,10000,tcp
2026-08-01T00:06:00Z,192.168.1.15,10.0.0.5,tcp,64,0.001,FIN,64000.00,closed,anomaly,PortScan,64,0,1000,tcp
2026-08-01T00:07:00Z,192.168.1.15,10.0.0.6,tcp,64,0.001,FIN,64000.00,closed,anomaly,PortScan,64,0,1000,tcp
2026-08-01T00:08:00Z,192.168.1.15,10.0.0.7,tcp,64,0.001,FIN,64000.00,closed,anomaly,PortScan,64,0,1000,tcp
2026-08-01T00:09:00Z,0.0.0.0,10.0.0.5,udp,512,0.05,NONE,10240.00,closed,anomaly,Spoofing,512,0,50000,udp
2026-08-01T00:10:00Z,192.168.1.20,10.0.0.1,tcp,1420,0.85,ACK,1670.58,established,normal,none,1420,5120,850000,tcp
2026-08-01T00:11:00Z,192.168.1.21,10.0.0.2,tcp,2048,1.20,ACK,1706.66,established,normal,none,2048,8192,1200000,tcp
2026-08-01T00:12:00Z,10.0.0.100,10.0.0.5,udp,8192,0.02,NONE,409600.00,closed,anomaly,Jamming,8192,0,20000,udp
2026-08-01T00:13:00Z,192.168.1.25,10.0.0.3,tcp,850,0.30,ACK,2833.33,established,normal,none,850,2048,300000,tcp
2026-08-01T00:14:00Z,192.168.1.26,10.0.0.4,tcp,400,0.15,ACK,2666.66,established,normal,none,400,1024,150000,tcp`;

exports.seedDemoDataset = async (forcedOwnerId = null) => {
  try {
    const existingDataset = await Dataset.findOne({ name: 'Preloaded Demo Defense Network Dataset' });
    if (existingDataset) {
      console.log('[SEED] Demo dataset already present in database.');
      return existingDataset;
    }

    const candidatePaths = [
      path.resolve(__dirname, '../data/demo_defense_dataset.csv'),
      path.resolve(__dirname, '../../../datasets/demo_defense_dataset.csv'),
    ];
    let demoPath = candidatePaths.find((p) => fs.existsSync(p));
    let csvLines = [];

    if (demoPath) {
      const fileContent = fs.readFileSync(demoPath, 'utf-8');
      csvLines = fileContent.split(/\r?\n/).filter((l) => l.trim());
    } else {
      console.log('[SEED] Using inline CSV data string for demo dataset seeding.');
      csvLines = INLINE_DEMO_CSV.split('\n').filter((l) => l.trim());
      demoPath = 'inline://demo_defense_dataset.csv';
    }

    // Determine owner
    let ownerId = forcedOwnerId;
    if (!ownerId) {
      const adminUser = await User.findOne({ role: 'admin' }) || await User.findOne();
      if (adminUser) {
        ownerId = adminUser._id;
      } else {
        ownerId = new (require('mongoose').Types.ObjectId)('000000000000000000000000');
      }
    }

    const recordCount = Math.max(0, csvLines.length - 1);

    const compatibilityReport = {
      score: 100,
      matchedFields: {
        src_ip: 'src_ip',
        dst_ip: 'dst_ip',
        protocol: 'protocol',
        packet_size: 'packet_size',
        duration: 'duration',
        tcp_flags: 'tcp_flags',
        byte_rate: 'byte_rate',
        connection_state: 'connection_state',
        label: 'label',
      },
      missingFields: [],
      fallbackUsed: {},
      warnings: [],
    };

    const dataset = await Dataset.create({
      name: 'Preloaded Demo Defense Network Dataset',
      source: 'CICIDS / UNSW-NB15 Synthetic Defense Benchmark',
      uploadedBy: ownerId,
      filePath: demoPath,
      fileSize: demoPath.startsWith('inline') ? Buffer.byteLength(INLINE_DEMO_CSV) : fs.statSync(demoPath).size,
      recordCount,
      status: 'ready',
      analysisCount: 1,
      lastAnalyzedAt: new Date(),
      compatibilityReport,
    });

    const trafficRecords = [];
    const anomalyResults = [];

    let headers = null;
    let index = 0;

    for (const line of csvLines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (!headers) {
        headers = trimmed.split(',').map((h) => h.trim().toLowerCase());
        continue;
      }

      const values = trimmed.split(',').map((v) => v.trim());
      const row = Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));

      const packetSize = parseFloat(row.packet_size || row.src_bytes) || 0;
      const duration = parseFloat(row.duration || row.flow_duration) || 0;
      const byteRate = parseFloat(row.byte_rate) || 0;
      const label = row.label === 'anomaly' ? 'anomaly' : 'normal';
      const attackCat = row.attack_cat || 'none';
      const severity = label === 'anomaly' ? 'critical' : 'normal';
      const timestamp = row.timestamp ? new Date(row.timestamp) : new Date();
      const srcIp = row.src_ip || '0.0.0.0';
      const dstIp = row.dst_ip || '0.0.0.0';
      const protocol = row.protocol || 'tcp';
      const flags = row.tcp_flags || '';

      const recordId = new (require('mongoose').Types.ObjectId)();

      trafficRecords.push({
        _id: recordId,
        datasetId: dataset._id,
        srcIp,
        dstIp,
        protocol,
        packetSize,
        duration,
        flags,
        byteRate,
        connectionState: row.connection_state || 'established',
        eventTimestamp: timestamp,
        severity,
        label,
        rowIndex: index,
      });

      if (label === 'anomaly') {
        let threatType = 'suspicious_activity';
        if (attackCat.toLowerCase().includes('dos') || attackCat.toLowerCase().includes('jamming')) {
          threatType = 'jamming';
        } else if (attackCat.toLowerCase().includes('spoofing')) {
          threatType = 'spoofing';
        } else if (attackCat.toLowerCase().includes('scan') || attackCat.toLowerCase().includes('intrusion')) {
          threatType = 'intrusion_attempt';
        }

        const riskScore = threatType === 'jamming' || threatType === 'intrusion_attempt' ? 0.88 : 0.74;

        anomalyResults.push({
          recordId,
          datasetId: dataset._id,
          jobId: `job_demo_${dataset._id}`,
          modelId: 'isolation_forest_v1',
          riskScore,
          classification: 'critical',
          threatType,
          confidence: 0.92,
          isAnomaly: true,
          srcIp,
          dstIp,
          protocol,
          packetSize,
          duration,
          byteRate,
          flags,
          explanation: {
            summary: `Automated threat detection: ${attackCat} pattern flagged on ${protocol.toUpperCase()} flow.`,
            signals: [`High packet size (${packetSize}B)`, `Burst rate (${byteRate} B/s)`, `Anomalous TCP state`],
            risk_score: riskScore,
            classification: 'critical',
            threat_type: threatType,
          },
          attackPhase: attackCat !== 'none' ? attackCat : 'Suspicious Flow',
          eventTimestamp: timestamp,
          rowIndex: index,
          flaggedBy: ownerId,
          status: 'new',
          detectedAt: new Date(),
        });
      }

      index++;
    }

    if (trafficRecords.length > 0) {
      await TrafficRecord.insertMany(trafficRecords, { ordered: false });
    }
    if (anomalyResults.length > 0) {
      await AnomalyResult.insertMany(anomalyResults, { ordered: false });
    }

    console.log(`[SEED] Demo dataset fully seeded: ${trafficRecords.length} records, ${anomalyResults.length} anomalies. ID: ${dataset._id}`);
    return dataset;
  } catch (err) {
    console.error('[SEED] Error seeding demo dataset:', err.message);
    return null;
  }
};
