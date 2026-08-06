const path = require('path');
const fs = require('fs');
const readline = require('readline');
const Dataset = require('../models/Dataset');
const TrafficRecord = require('../models/TrafficRecord');
const User = require('../models/User');

exports.seedDemoDataset = async () => {
  try {
    const datasetCount = await Dataset.countDocuments();
    if (datasetCount > 0) {
      console.log('[SEED] Datasets already present in database. Skipping demo seeding.');
      return;
    }

    const demoPath = path.resolve(__dirname, '../../../datasets/demo_defense_dataset.csv');
    if (!fs.existsSync(demoPath)) {
      console.log('[SEED] Demo dataset CSV not found at', demoPath);
      return;
    }

    // Find or create admin user to own demo dataset
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      adminUser = await User.findOne();
    }
    if (!adminUser) {
      console.log('[SEED] No user available to own demo dataset. Skipping seed.');
      return;
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
      uploadedBy: adminUser._id,
      filePath: demoPath,
      fileSize: fs.statSync(demoPath).size,
      recordCount,
      status: 'ready',
      compatibilityReport,
    });

    // Ingest records into TrafficRecord
    const rows = [];
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
      const severity = label === 'anomaly' ? 'critical' : 'normal';

      rows.push({
        datasetId: dataset._id,
        srcIp: row.src_ip || '0.0.0.0',
        dstIp: row.dst_ip || '0.0.0.0',
        protocol: row.protocol || 'tcp',
        packetSize,
        duration,
        flags: row.tcp_flags || '',
        byteRate,
        connectionState: row.connection_state || 'established',
        eventTimestamp: row.timestamp ? new Date(row.timestamp) : new Date(),
        severity,
        label,
        rowIndex: index++,
      });
    }

    if (rows.length > 0) {
      await TrafficRecord.insertMany(rows, { ordered: false });
    }

    console.log(`[SEED] Preloaded demo dataset successfully seeded (${rows.length} traffic records). ID: ${dataset._id}`);
  } catch (err) {
    console.error('[SEED] Error seeding demo dataset:', err.message);
  }
};
