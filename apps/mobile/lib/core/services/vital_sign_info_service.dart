import 'package:flutter/material.dart';

class VitalSignInfo {
  final String name;
  final String description;
  final String normalRange;
  final String clinicalSignificance;
  final String interpretation;
  final IconData icon;
  final Color color;
  final List<String> factors;
  final String category;

  const VitalSignInfo({
    required this.name,
    required this.description,
    required this.normalRange,
    required this.clinicalSignificance,
    required this.interpretation,
    required this.icon,
    required this.color,
    required this.factors,
    required this.category,
  });
}

class VitalSignInfoService {
  static const Map<int, VitalSignInfo> _vitalSignInfo = {
    // Primary Vitals
    0x1: VitalSignInfo(
      // pulseRate
      name: 'Heart Rate (Pulse Rate)',
      description:
          'The number of times your heart beats per minute. Think of your heart as a pump that pushes blood through your body. With every beat, the heart pumps blood containing oxygen and nutrients around the body and brings back waste products.',
      normalRange:
          '60-100 bpm (normal resting rate for healthy adults)\nLower rates common in athletes\nHigher rates may indicate health conditions',
      clinicalSignificance:
          'A healthy heart supplies the body with the right amount of blood at a rate proportionate to whatever activity the body is undertaking. Normal resting rates can differ between people.',
      interpretation:
          'At rest, a fast Heart Rate may indicate acute health conditions such as an infection, dehydration, stress, anxiety, thyroid disorder, shock, anemia, or certain heart conditions. A low Heart Rate is common for people who exercise frequently and participate in athletics.',
      icon: Icons.favorite,
      color: Colors.red,
      factors: [
        'Weather conditions',
        'Body position',
        'Emotions',
        'Body size',
        'Medications',
        'Caffeine and nicotine use',
        'Physical activity',
        'Stress levels',
      ],
      category: 'Primary Vitals',
    ),
    0x2: VitalSignInfo(
      // respirationRate
      name: 'Breathing Rate (Respiration Rate)',
      description:
          'The number of breaths you take per minute. When you inhale, oxygen enters your lungs and circulates to the various internal organs. When you exhale, carbon dioxide moves out of the body.',
      normalRange:
          '12-20 breaths per minute (normal at-rest rate for healthy adults)\nSlightly faster in women than men',
      clinicalSignificance:
          'A normal Breathing Rate plays a critical role in keeping the balance of oxygen and carbon dioxide even in the body. If the oxygen level in the blood is low, or if the carbon dioxide level in the blood is high, your Breathing Rate increases.',
      interpretation:
          'A high or low rate might be the result of an activity and therefore does not indicate that there is anything wrong. However, in other cases, such as various diseases, injuries, dehydration, or heart problems, a change in the Breathing Rate may occur that can be considered abnormal, thereby necessitating medical attention.',
      icon: Icons.air,
      color: Colors.blue,
      factors: [
        'Injuries',
        'Exercise',
        'Fever',
        'Anxiety',
        'Emotions',
        'Mood',
        'Alcohol',
        'Medication',
        'Metabolic issues',
        'Medical conditions',
      ],
      category: 'Primary Vitals',
    ),
    0x4: VitalSignInfo(
      // oxygenSaturation
      name: 'Oxygen Saturation (SpO2)',
      description:
          'A measure of how much oxygen the red blood cells are carrying from the lungs to the rest of the body. This measurement indicates the percentage of hemoglobin molecules that are carrying oxygen.',
      normalRange:
          '95-100% (normal for healthy lungs)\n90-94% (may indicate mild hypoxemia)\n<90% (severe hypoxemia requiring medical attention)',
      clinicalSignificance:
          'Critical indicator of respiratory function and oxygen delivery to tissues. Lower levels may indicate respiratory or cardiovascular problems.',
      interpretation:
          'Values below 95% may indicate respiratory or cardiovascular problems requiring medical attention. For individuals with chronic conditions or lung diseases, values could be lower than 95% but should be monitored by healthcare providers.',
      icon: Icons.water_drop,
      color: Colors.cyan,
      factors: [
        'Altitude',
        'Respiratory conditions',
        'Cardiovascular health',
        'Smoking',
        'Age',
        'Chronic lung diseases',
      ],
      category: 'Primary Vitals',
    ),

    // Cardiovascular
    0x40: VitalSignInfo(
      // bloodPressure
      name: 'Blood Pressure',
      description:
          'The pressure of blood exerted on the walls of the arteries, which carry blood from the heart to other parts of the body. Blood Pressure measures the pressure of circulating blood against artery walls, and it is measured by two numbers.',
      normalRange:
          '<100 mmHg (low)\n100-129 mmHg (normal systolic)\n130+ mmHg (elevated)',
      clinicalSignificance:
          'The first number, or systolic pressure, refers to the pressure inside the artery when the heart contracts and pumps blood throughout the body. The second number, or diastolic pressure, refers to the pressure inside the artery when the heart is at rest and is filling with blood.',
      interpretation:
          'Most people don\'t know if they have high Blood Pressure - especially since there may be no noticeable warning signs or symptoms. Consistently high blood pressure readings may result in a diagnosis of high blood pressure (hypertension), which poses a higher risk for health problems such as heart disease, heart attack, and stroke.',
      icon: Icons.monitor_heart,
      color: Colors.purple,
      factors: [
        'Physical inactivity',
        'Stressful life',
        'Obesity',
        'Shift work',
        'Pregnancy',
        'Age',
        'Weight',
        'Diet',
        'Exercise',
        'Genetics',
        'Medications',
      ],
      category: 'Cardiovascular',
    ),
    0x1000000000: VitalSignInfo(
      // meanArterialPressure
      name: 'Mean Arterial Pressure (MAP)',
      description:
          'The average pressure in arteries during one cardiac cycle, calculated from blood pressure.',
      normalRange: '70-105 mmHg (normal)\n60-70 mmHg (low)\n>105 mmHg (high)',
      clinicalSignificance:
          'Better indicator of organ perfusion than systolic pressure alone.',
      interpretation:
          'MAP below 60 mmHg may indicate inadequate blood flow to organs. High MAP increases cardiovascular risk.',
      icon: Icons.show_chart,
      color: Colors.purple,
      factors: [
        'Cardiac output',
        'Systemic vascular resistance',
        'Blood volume',
        'Heart rate',
      ],
      category: 'Cardiovascular',
    ),
    0x4000000000: VitalSignInfo(
      // pulsePressure
      name: 'Pulse Pressure',
      description:
          'The difference between systolic and diastolic blood pressure.',
      normalRange: '30-50 mmHg (normal)\n<30 mmHg (narrow)\n>50 mmHg (wide)',
      clinicalSignificance:
          'Indicates arterial stiffness and cardiovascular health.',
      interpretation:
          'Wide pulse pressure may indicate arterial stiffness or aortic valve disease. Narrow pulse pressure may indicate heart failure or shock.',
      icon: Icons.graphic_eq,
      color: Colors.purple,
      factors: [
        'Arterial stiffness',
        'Aortic valve function',
        'Cardiac output',
        'Age',
      ],
      category: 'Cardiovascular',
    ),
    0x2000000000: VitalSignInfo(
      // cardiacWorkload
      name: 'Cardiac Workload',
      description:
          'The amount of work the heart performs to pump blood throughout the body.',
      normalRange:
          'Varies by individual\nLower values indicate better efficiency',
      clinicalSignificance:
          'Indicates heart efficiency and cardiovascular fitness.',
      interpretation:
          'Lower workload suggests better cardiovascular fitness. Higher workload may indicate heart strain or inefficiency.',
      icon: Icons.fitness_center,
      color: Colors.deepPurple,
      factors: [
        'Heart rate',
        'Blood pressure',
        'Cardiac output',
        'Fitness level',
      ],
      category: 'Cardiovascular',
    ),

    // Stress & Wellness
    0x10: VitalSignInfo(
      // stressLevel
      name: 'Stress Level',
      description:
          'Assessment of psychological and physiological stress based on autonomic nervous system activity. The stress index is calculated from the Heart Rate Variability (HRV) measurements, which means that stress levels are derived from physiological conditions.',
      normalRange:
          'Low Stress Level (optimal)\nMild Stress Level (acceptable)\nNormal Stress Level (moderate)\nHigh Stress Level (concerning)\nVery High Stress Level (requires attention)',
      clinicalSignificance:
          'HRV analysis is a globally accepted methodology and technique for evaluating the functional state of an organism and, specifically, components of the autonomic nervous system.',
      interpretation:
          'Very High and High stress levels are correlated with a low wellness score, while Mild and Normal stress levels are correlated with a medium wellness score. The Stress Index is used to set the Stress Level.',
      icon: Icons.psychology,
      color: Colors.orange,
      factors: [
        'Work pressure',
        'Personal relationships',
        'Financial stress',
        'Health concerns',
        'Sleep quality',
        'HRV measurements',
        'Autonomic nervous system function',
      ],
      category: 'Stress & Wellness',
    ),
    0x80: VitalSignInfo(
      // stressIndex
      name: 'Stress Index',
      description:
          'The Stress Index is calculated from the Heart Rate Variability (HRV) measurements, which means that stress levels are derived from physiological conditions.',
      normalRange:
          'Varies by individual\nLower values indicate lower stress\nHigher values indicate higher stress',
      clinicalSignificance:
          'HRV analysis is a globally accepted methodology and technique for evaluating the functional state of an organism and, specifically, components of the autonomic nervous system.',
      interpretation:
          'The Stress Index is used to set the Stress Level. Higher values indicate greater stress burden. Chronic high stress can lead to health problems.',
      icon: Icons.trending_up,
      color: Colors.orange,
      factors: [
        'Psychological stress',
        'Physical stress',
        'Environmental factors',
        'Sleep quality',
        'Exercise',
        'HRV measurements',
        'Autonomic nervous system',
      ],
      category: 'Stress & Wellness',
    ),
    0x4000000: VitalSignInfo(
      // normalizedStressIndex
      name: 'Normalized Stress Index',
      description:
          'Stress is the body\'s reaction to a challenge or demand. The Normalized Stress Level is calculated from the Stress Index and scaled to a range of 0 to 100.',
      normalRange:
          '0-100 scale\nLower values indicate lower stress\nHigher values indicate higher stress',
      clinicalSignificance:
          'The Normalized Stress Index is calculated from the Heart Rate Variability (HRV) measurements and derived from physiological conditions.',
      interpretation:
          'A high value indicates high stress. HRV analysis is a globally accepted methodology and technique for evaluating the functional state of an organism and, specifically, components of the autonomic nervous system.',
      icon: Icons.insights,
      color: Colors.orange,
      factors: [
        'Age',
        'Baseline stress levels',
        'Life circumstances',
        'Health status',
        'HRV measurements',
        'Physiological conditions',
      ],
      category: 'Stress & Wellness',
    ),
    0x20000: VitalSignInfo(
      // wellnessIndex
      name: 'Wellness Score',
      description:
          'The Wellness Score is a prediction risk score that is used to predict a person\'s cardiovascular risk for the next 5 to 10 years. The Wellness Score is based on the vital signs measured by our technology.',
      normalRange:
          'Higher scores indicate lower cardiovascular risk\nLower scores indicate higher cardiovascular risk',
      clinicalSignificance:
          'The Wellness Score is designed to serve as a reference when measured at rest, under similar conditions during all of the measurements, and if the score is consistent in repeated measurements over time.',
      interpretation:
          'The higher the wellness score, the lower the cardiovascular risk. Generally, a lower Heart Rate at rest implies more efficient heart function and better cardiovascular fitness. Therefore, a higher Heart Rate reduces your Wellness Score - even when the heart rate is within the normal range.',
      icon: Icons.health_and_safety,
      color: Colors.green,
      factors: [
        'Heart Rate',
        'Stress Level',
        'Oxygen Saturation',
        'Blood Pressure',
        'HRV measures',
        'Overall cardiovascular health',
        'Fitness level',
      ],
      category: 'Stress & Wellness',
    ),
    0x40000: VitalSignInfo(
      // wellnessLevel
      name: 'Wellness Level',
      description:
          'Overall assessment of physical and mental well-being based on multiple physiological parameters.',
      normalRange: 'High (optimal)\nModerate (acceptable)\nLow (concerning)',
      clinicalSignificance:
          'Comprehensive indicator of overall health and lifestyle quality.',
      interpretation:
          'High wellness indicates good health habits and low stress. Low wellness may suggest need for lifestyle changes.',
      icon: Icons.eco,
      color: Colors.green,
      factors: [
        'Physical fitness',
        'Mental health',
        'Nutrition',
        'Sleep quality',
        'Stress levels',
      ],
      category: 'Stress & Wellness',
    ),
    0x8000000000: VitalSignInfo(
      // bodyTensionScore
      name: 'Body Tension Score',
      description:
          'Assessment of muscle tension and physical stress based on autonomic nervous system activity.',
      normalRange: 'Low (optimal)\nModerate (acceptable)\nHigh (concerning)',
      clinicalSignificance:
          'Indicates physical stress and muscle tension levels.',
      interpretation:
          'High tension may indicate stress, poor posture, or physical strain. Regular relaxation techniques can help.',
      icon: Icons.sports_martial_arts,
      color: Colors.deepOrange,
      factors: [
        'Physical activity',
        'Posture',
        'Stress levels',
        'Sleep quality',
        'Work environment',
      ],
      category: 'Stress & Wellness',
    ),

    // HRV Metrics
    0x8: VitalSignInfo(
      // sdnn
      name: 'HRV SDNN',
      description:
          'SDNN is a calculated parameter of Heart Rate Variability (HRV) that represents the standard deviation of normal-to-normal R-R-intervals. SDNN is expressed in milliseconds.',
      normalRange:
          '>50 ms (normal value)\nValues dependent on age and gender\nNormally become lower with age',
      clinicalSignificance:
          'An individual\'s heartbeats do not occur at constant intervals, but rather with a small variance between them. HRV measures the variation in time between the heartbeats.',
      interpretation:
          'High levels of HRV generally indicate aerobic and general fitness. Athletes may track HRV to adjust their training program. They can learn when the body is being overworked, which often results in a drop in HRV, and can learn how fast they recover. Moreover, persons with high HRV may be more resilient to stress.',
      icon: Icons.show_chart,
      color: Colors.teal,
      factors: [
        'Age',
        'Gender',
        'Aerobic fitness',
        'General fitness',
        'Training load',
        'Recovery status',
        'Stress resilience',
        'Lifestyle changes',
      ],
      category: 'HRV Metrics',
    ),
    0x200: VitalSignInfo(
      // rmssd
      name: 'RMSSD',
      description:
          'An important measure of the Heart Rate Variability. RMSSD is the root mean square of successive RR interval differences. It reflects the beat-to-beat variance in the heart rate.',
      normalRange:
          'Varies by individual\nHigher values indicate better parasympathetic control',
      clinicalSignificance:
          'RMSSD can help identify a general level of fatigue. In addition, a higher RMSSD is linked to parasympathetic control, a sign that you are in the "rest and digest" mode.',
      interpretation:
          'A lower RMSSD is linked to elevated sympathetic activity, an indication of a Stress Response. RMSSD is one of the parameters used to calculate the PNS Index, along with Mean RRi and SD1.',
      icon: Icons.analytics,
      color: Colors.teal,
      factors: [
        'Recovery status',
        'Training load',
        'Stress levels',
        'Sleep quality',
        'Age',
        'Fitness level',
        'Parasympathetic activity',
      ],
      category: 'HRV Metrics',
    ),
    0x20: VitalSignInfo(
      // rri
      name: 'RRi Data (RR Interval)',
      description:
          'The RR interval is the time between the "R" peaks of successive heartbeats, in milliseconds. An individual\'s heartbeats do not occur at constant intervals, but rather with a small variance between them.',
      normalRange:
          '600-1000 ms (normal resting)\nVaries with heart rate\nCan be exported for analysis',
      clinicalSignificance:
          'Heart Rate Variability (HRV) is the variation in time between the heartbeats. You can export the RR interval data for analysis use.',
      interpretation:
          'Consistent intervals indicate regular rhythm. Irregular intervals may suggest arrhythmias or autonomic dysfunction. The variation in these intervals provides valuable information about autonomic nervous system function.',
      icon: Icons.timeline,
      color: Colors.teal,
      factors: [
        'Heart rate',
        'Autonomic function',
        'Arrhythmias',
        'Medications',
        'Physical activity',
        'Stress levels',
        'Health conditions',
      ],
      category: 'HRV Metrics',
    ),
    0x100: VitalSignInfo(
      // meanRri
      name: 'Mean RRi',
      description:
          'Mean RRi is the average time between the RR intervals (RRi) in milliseconds. RRi is the variation of the interval between successive heartbeats.',
      normalRange:
          '600-1000 ms (normal resting)\nCorresponds to 60-100 bpm\nLonger intervals indicate lower heart rate',
      clinicalSignificance:
          'A longer Mean RR interval indicates a lower heart rate and higher parasympathetic cardiac activation.',
      interpretation:
          'The Mean RRi is one of the parameters used to calculate the PNS Index, along with RMSSD and SD1. Shorter intervals indicate higher heart rate, while longer intervals indicate lower heart rate.',
      icon: Icons.assessment,
      color: Colors.teal,
      factors: [
        'Heart rate',
        'Parasympathetic activation',
        'Fitness level',
        'Age',
        'Physical activity',
        'Stress levels',
        'Recovery status',
      ],
      category: 'HRV Metrics',
    ),
    0x400: VitalSignInfo(
      // sd1
      name: 'SD1',
      description:
          'SD1 is a poincaré plot standard deviation perpendicular to the line of identity.',
      normalRange:
          'Varies by individual\nHigher values indicate better parasympathetic function',
      clinicalSignificance:
          'SD1 is one of the parameters used to calculate the PNS Index, along with RRi and RMSSD.',
      interpretation:
          'Higher values suggest better parasympathetic function and short-term variability. Lower values may indicate stress or fatigue.',
      icon: Icons.scatter_plot,
      color: Colors.cyan,
      factors: [
        'Parasympathetic activity',
        'Recovery status',
        'Stress levels',
        'Training load',
        'Sleep quality',
        'Short-term variability',
      ],
      category: 'HRV Metrics',
    ),
    0x800: VitalSignInfo(
      // sd2
      name: 'SD2',
      description:
          'SD2 is a poincaré plot standard deviation along the line of identity.',
      normalRange:
          'Varies by individual\nHigher values indicate better overall autonomic function',
      clinicalSignificance:
          'SD2 is one of the parameters used to calculate the SNS Index, along with Heart Rate and Baevsky\'s Stress Index.',
      interpretation:
          'Higher values indicate better overall autonomic function and long-term variability. Lower values may suggest health issues or autonomic dysfunction.',
      icon: Icons.scatter_plot,
      color: Colors.cyan,
      factors: [
        'Overall autonomic function',
        'Cardiovascular health',
        'Age',
        'Fitness level',
        'Health status',
        'Long-term variability',
        'Sympathetic activity',
      ],
      category: 'HRV Metrics',
    ),
    0x1000: VitalSignInfo(
      // prq
      name: 'PRQ (Pulse-Respiration Quotient)',
      description:
          'The Pulse-Respiration Quotient (PRQ) is a measure of the ratio of a person\'s pulse rate (measured in beats per minute) to their respiratory rate (measured in breaths per minute).',
      normalRange:
          'Around 5 (normal ratio)\nAt 60 bpm: ~12 rpm expected\nAt 100 bpm: ~20 rpm expected',
      clinicalSignificance:
          'The PRQ reflects the efficiency with which the heart and lungs are working together. This ratio is kept both when the pulse rate is low and when it is high.',
      interpretation:
          'A low or high score would indicate that your HR and/or BR are working disproportionately, which may indicate that both the heart and the lungs are working inefficiently. Moreover, a person\'s pathophysiological state (the functional changes associated with or resulting from disease or injury) is indicated by abnormal PRQ readings.',
      icon: Icons.query_stats,
      color: Colors.lightBlue,
      factors: [
        'Heart rate efficiency',
        'Respiratory efficiency',
        'Cardiopulmonary coordination',
        'Overall health status',
        'Physical fitness',
      ],
      category: 'HRV Metrics',
    ),
    0x80000: VitalSignInfo(
      // lfhf
      name: 'LF/HF',
      description:
          'LF and HF stand for Low-Frequency and High-Frequency bands, which represent the Sympathetic and Parasympathetic activity, respectively.',
      normalRange:
          'LF(ms²)/HF(ms²) = 0.27-0.38 (normal range)\nLower ratio indicates high Parasympathetic activity\nHigher ratio indicates increased Sympathetic activity',
      clinicalSignificance:
          'The LF/HF ratio reflects the balance between sympathetic and parasympathetic activity.',
      interpretation:
          'A lower ratio of LF/HF indicates a high Parasympathetic stress level, and a higher ratio indicates an increased Sympathetic activity which is a biomarker of stress.',
      icon: Icons.equalizer,
      color: Colors.indigo,
      factors: [
        'Sympathetic activity',
        'Parasympathetic activity',
        'Stress levels',
        'Autonomic balance',
        'Physical activity',
        'Sleep quality',
        'Health status',
      ],
      category: 'HRV Metrics',
    ),

    // ANS Balance
    0x2000: VitalSignInfo(
      // pnsIndex
      name: 'PNS Index',
      description:
          'The PNS Index calculation is based on the following three parameters: Mean RRi, RMSSD, and SD1, and is used to indicate the body\'s Recovery Ability zones.',
      normalRange:
          'Varies by individual\nHigher values indicate better parasympathetic function',
      clinicalSignificance:
          'Indicates rest, recovery, and relaxation capacity. The parasympathetic metric measures the activity of the PNS and indicates how capable a person is of relaxing or recovering after stressful events.',
      interpretation:
          'Higher values suggest better recovery and stress resilience. Lower values may indicate chronic stress. The system plays an important role in alleviating stress and promoting recovery.',
      icon: Icons.spa,
      color: Colors.green,
      factors: [
        'Recovery status',
        'Stress levels',
        'Sleep quality',
        'Meditation',
        'Physical fitness',
        'Mean RRi',
        'RMSSD',
        'SD1',
      ],
      category: 'ANS Balance',
    ),
    0x4000: VitalSignInfo(
      // pnsZone
      name: 'Recovery Ability (PNS Zone)',
      description:
          'The Recovery Ability that is also known as "rest and digest" response refers to the body\'s ability to recover, accumulate energy, and regulate bodily functions after stressful occurrences.',
      normalRange:
          'High Zone (optimal)\nNormal Zone (acceptable)\nLow Zone (concerning)',
      clinicalSignificance:
          'This is part of the autonomic system that consists of two sub-systems, the sympathetic (Stress Response) system and the parasympathetic (Recovery Ability) system. Your Heart Rate Variability is reflected in the balance between these two sub-systems.',
      interpretation:
          'The normal and high zones are more desirable than the low zone. In the normal and high zones, the body is able to effectively conserve energy, relax, or recover from a stressful occurrence. A low zone would indicate a stressful state, while a high zone would suggest calmness.',
      icon: Icons.self_improvement,
      color: Colors.lightGreen,
      factors: [
        'Recovery status',
        'Stress management',
        'Sleep quality',
        'Physical activity',
        'Energy conservation',
        'Relaxation capacity',
      ],
      category: 'ANS Balance',
    ),
    0x8000: VitalSignInfo(
      // snsIndex
      name: 'SNS Index',
      description:
          'The SNS index is calculated based on the following three parameters: Heart Rate, Baevsky\'s stress index, SD2, and is used to set the stress response zone.',
      normalRange:
          'Varies by individual\nModerate levels are normal\nHigh levels may indicate excessive stress',
      clinicalSignificance:
          'Indicates stress response and alertness level. The sympathetic nervous system (SNS) activates numerous complex pathways and components when preparing for an emergency.',
      interpretation:
          'Moderate levels are normal for daily activities. High levels may indicate excessive stress. When preparing for an emergency, the SNS activates physiological activities to achieve a faster heart rate, breathing rate, and blood pressure.',
      icon: Icons.flash_on,
      color: Colors.amber,
      factors: [
        'Stress levels',
        'Physical activity',
        'Caffeine intake',
        'Sleep quality',
        'Emotional state',
        'Heart Rate',
        'Baevsky\'s stress index',
        'SD2',
      ],
      category: 'ANS Balance',
    ),
    0x10000: VitalSignInfo(
      // snsZone
      name: 'Stress Response (SNS Zone)',
      description:
          'The Stress Response, which is also known as "fight or flight" response, refers to a physiological reaction to imminent danger that occurs when we are scared, anxious, stressed, attacked, or threatened.',
      normalRange:
          'Low Zone (relaxed)\nNormal Zone (normal)\nHigh Zone (stressed)',
      clinicalSignificance:
          'Essentially, it prepares our body to either deal with a threat or to run for safety. This is part of the autonomic system that consists of two sub-systems, the sympathetic (Stress Response) system and the parasympathetic (recovery ability) system.',
      interpretation:
          'The normal and low zones are more desirable than the high zone. In the normal and low zones, the body is able to effectively respond to stressful situations and emergencies. The stress created by a situation is helpful and increases the chances of coping effectively with the threat.',
      icon: Icons.person_outline,
      color: Colors.orange,
      factors: [
        'Stress response',
        'Alertness',
        'Physical activity',
        'Environmental factors',
        'Threat perception',
        'Emergency preparedness',
        'Coping mechanisms',
      ],
      category: 'ANS Balance',
    ),

    // Risk Assessment
    0x800000: VitalSignInfo(
      // highHemoglobinA1CRisk
      name: 'High HbA1c Risk',
      description:
          'Risk assessment for elevated hemoglobin A1c levels indicating diabetes risk.',
      normalRange:
          'Low Risk (optimal)\nModerate Risk (monitor)\nHigh Risk (medical attention needed)',
      clinicalSignificance:
          'Indicates risk for diabetes and related complications.',
      interpretation:
          'High risk suggests need for lifestyle changes and medical monitoring. Early intervention can prevent diabetes.',
      icon: Icons.warning,
      color: Colors.red,
      factors: [
        'Blood sugar levels',
        'Diet',
        'Exercise',
        'Weight',
        'Family history',
        'Age',
      ],
      category: 'Risk Assessment',
    ),
    0x1000000: VitalSignInfo(
      // highBloodPressureRisk
      name: 'High Blood Pressure Risk',
      description:
          'Risk assessment for hypertension and related cardiovascular complications.',
      normalRange:
          'Low Risk (optimal)\nModerate Risk (monitor)\nHigh Risk (medical attention needed)',
      clinicalSignificance:
          'Indicates risk for cardiovascular disease, stroke, and kidney disease.',
      interpretation:
          'High risk requires lifestyle modifications and may need medication. Regular monitoring is essential.',
      icon: Icons.warning_amber,
      color: Colors.red,
      factors: [
        'Blood pressure',
        'Age',
        'Weight',
        'Diet',
        'Exercise',
        'Stress',
        'Family history',
      ],
      category: 'Risk Assessment',
    ),
    0x2000000: VitalSignInfo(
      // ascvdRisk
      name: 'ASCVD Risk (Atherosclerotic Cardiovascular Disease)',
      description:
          '10-year risk of developing atherosclerotic cardiovascular disease.',
      normalRange:
          '<5% (low risk)\n5-7.5% (borderline risk)\n7.5-20% (intermediate risk)\n>20% (high risk)',
      clinicalSignificance:
          'Comprehensive cardiovascular risk assessment for treatment decisions.',
      interpretation:
          'Higher percentages indicate greater risk for heart attack and stroke. Risk reduction strategies are recommended.',
      icon: Icons.heart_broken,
      color: Colors.red,
      factors: [
        'Age',
        'Gender',
        'Blood pressure',
        'Cholesterol',
        'Diabetes',
        'Smoking',
        'Family history',
      ],
      category: 'Risk Assessment',
    ),
    0x800000000: VitalSignInfo(
      // ascvdRiskLevel
      name: 'ASCVD Risk Level',
      description:
          'Categorical assessment of atherosclerotic cardiovascular disease risk.',
      normalRange:
          'Low (optimal)\nModerate (monitor)\nHigh (medical attention needed)',
      clinicalSignificance:
          'Simplified risk categorization for treatment guidance.',
      interpretation:
          'High risk requires aggressive risk factor modification and medical management.',
      icon: Icons.security,
      color: Colors.red,
      factors: [
        'Overall cardiovascular risk',
        'Multiple risk factors',
        'Age',
        'Health status',
      ],
      category: 'Risk Assessment',
    ),
    0x20000000: VitalSignInfo(
      // highTotalCholesterolRisk
      name: 'High Total Cholesterol Risk',
      description: 'Risk assessment for elevated total cholesterol levels.',
      normalRange:
          'Low Risk (optimal)\nModerate Risk (monitor)\nHigh Risk (medical attention needed)',
      clinicalSignificance:
          'Indicates risk for cardiovascular disease and atherosclerosis.',
      interpretation:
          'High risk requires dietary changes, exercise, and may need medication to lower cholesterol.',
      icon: Icons.warning_rounded,
      color: Colors.deepOrange,
      factors: [
        'Diet',
        'Exercise',
        'Weight',
        'Age',
        'Gender',
        'Family history',
        'Medications',
      ],
      category: 'Risk Assessment',
    ),
    0x200000000: VitalSignInfo(
      // highFastingGlucoseRisk
      name: 'High Fasting Glucose Risk',
      description: 'Risk assessment for elevated fasting blood glucose levels.',
      normalRange:
          'Low Risk (optimal)\nModerate Risk (monitor)\nHigh Risk (medical attention needed)',
      clinicalSignificance:
          'Indicates risk for diabetes and metabolic syndrome.',
      interpretation:
          'High risk suggests need for lifestyle modifications to prevent diabetes development.',
      icon: Icons.report_problem,
      color: Colors.orange,
      factors: [
        'Diet',
        'Exercise',
        'Weight',
        'Age',
        'Family history',
        'Physical activity',
      ],
      category: 'Risk Assessment',
    ),
    0x400000000: VitalSignInfo(
      // lowHemoglobinRisk
      name: 'Low Hemoglobin Risk',
      description:
          'Risk assessment for low hemoglobin levels indicating anemia risk.',
      normalRange:
          'Low Risk (optimal)\nModerate Risk (monitor)\nHigh Risk (medical attention needed)',
      clinicalSignificance:
          'Indicates risk for anemia and related complications.',
      interpretation:
          'High risk may require iron supplementation, dietary changes, or medical evaluation for underlying causes.',
      icon: Icons.error_outline,
      color: Colors.amber,
      factors: [
        'Iron intake',
        'Blood loss',
        'Nutrition',
        'Age',
        'Gender',
        'Health conditions',
      ],
      category: 'Risk Assessment',
    ),

    // Blood Analysis
    0x100000: VitalSignInfo(
      // hemoglobin
      name: 'Hemoglobin',
      description:
          'Protein in red blood cells that carries oxygen throughout the body.',
      normalRange:
          'Men: 13.8-17.2 g/dL\nWomen: 12.1-15.1 g/dL\nChildren: 11-16 g/dL',
      clinicalSignificance:
          'Indicates oxygen-carrying capacity and potential anemia.',
      interpretation:
          'Low levels may indicate anemia. High levels may indicate dehydration or other conditions.',
      icon: Icons.bloodtype,
      color: Colors.red,
      factors: [
        'Iron levels',
        'Nutrition',
        'Blood loss',
        'Age',
        'Gender',
        'Health conditions',
      ],
      category: 'Blood Analysis',
    ),
    0x200000: VitalSignInfo(
      // hemoglobinA1C
      name: 'Hemoglobin A1C',
      description: 'Average blood sugar levels over the past 2-3 months.',
      normalRange: '<5.7% (normal)\n5.7-6.4% (prediabetes)\n≥6.5% (diabetes)',
      clinicalSignificance:
          'Primary indicator of long-term blood sugar control and diabetes risk.',
      interpretation:
          'Higher values indicate poorer blood sugar control and increased diabetes risk.',
      icon: Icons.science,
      color: Colors.pink,
      factors: [
        'Blood sugar levels',
        'Diet',
        'Exercise',
        'Weight',
        'Medications',
        'Health conditions',
      ],
      category: 'Blood Analysis',
    ),

    // Heart Health
    0x10000000: VitalSignInfo(
      // heartAge
      name: 'Heart Age',
      description:
          'Estimated age of your heart based on cardiovascular risk factors.',
      normalRange: 'Should be close to chronological age\nLower is better',
      clinicalSignificance: 'Indicates cardiovascular health relative to age.',
      interpretation:
          'Heart age higher than chronological age suggests increased cardiovascular risk requiring lifestyle changes.',
      icon: Icons.cake,
      color: Colors.pinkAccent,
      factors: [
        'Blood pressure',
        'Cholesterol',
        'Smoking',
        'Diabetes',
        'Exercise',
        'Weight',
        'Age',
      ],
      category: 'Heart Health',
    ),
  };

  static VitalSignInfo? getVitalSignInfo(int vitalSignType) {
    return _vitalSignInfo[vitalSignType];
  }

  static List<VitalSignInfo> getAllVitalSignInfo() {
    return _vitalSignInfo.values.toList();
  }

  static List<VitalSignInfo> getVitalSignsByCategory(String category) {
    return _vitalSignInfo.values
        .where((info) => info.category == category)
        .toList();
  }

  static List<String> getAllCategories() {
    return _vitalSignInfo.values.map((info) => info.category).toSet().toList();
  }
}
