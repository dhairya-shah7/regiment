const path = require('path');
const fs = require('fs');
const readline = require('readline');
const Dataset = require('../models/Dataset');
const TrafficRecord = require('../models/TrafficRecord');
const AnomalyResult = require('../models/AnomalyResult');
const User = require('../models/User');

exports.seedDemoDataset = async (forcedOwnerId = null) => {
  try {
    const existingDataset = await Dataset.findOne({ name: 'Preloaded Demo Defense Network Dataset' });
    if (existingDataset) {
      console.log('[SEED] Demo dataset already present in database.');
      return existingDataset;
    }

    const demoPath = path.resolve(__dirname, '../../../datasets/demo_defense_dataset.csv');
    if (!fs.existsSync(demoPath)) {
      console.log('[SEED] Demo dataset CSV file not found at', demoPath);
      return null;
    }

    // Determine owner without creating dummy user documents
    let ownerId = forcedOwnerId;
    if (!ownerId) {
      const adminUser = await User.findOne({ role: 'admin' }) || await User.findOne();
      if (adminUser) {
        ownerId = adminUser._id;
      } else {
        ownerId = new (require('mongoose').Types.ObjectId)('000000000000000000000000');
      }
    }

    // Count rows
    let rowCount = 0;
    const rlCount = readline.createInterface({ input: fs.createReadStream(demoPath), crlfDelay: Infinity });
    for await (const line of rlCount) {
      if (line.trim()) rowCount++;
    }
    const recordCount = Math.max(0, rowCount - 1);

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
      fileSize: fs.statSync(demoPath).size,
      recordCount,
      status: 'ready',
      analysisCount: 1,
      lastAnalyzedAt: new Date(),
      compatibilityReport,
    });

    // Parse & Ingest TrafficRecords & AnomalyResults
    const trafficRecords = [];
    const anomalyResults = [];

    const rl = readline.createInterface({ input: fs.createReadStream(demoPath), crlfDelay: Infinity });
    let headers = null;
    let index = 0;

    for await (const line of rl) {
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

      // Seeding AnomalyResults for anomalies so Dashboard, Analysis, & Anomalies UI are populated instantly
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
