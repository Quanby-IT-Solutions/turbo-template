#!/bin/bash

# CloudWatch Alarms Setup Script
# This script creates CloudWatch alarms for monitoring ECS services

set -e

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
ACCOUNT_ID="${AWS_ACCOUNT_ID}"

# Validate required variables
if [ -z "$ACCOUNT_ID" ]; then
    echo "Error: AWS_ACCOUNT_ID environment variable is required"
    exit 1
fi

echo "=========================================="
echo "CloudWatch Alarms Setup"
echo "=========================================="
echo "Region: ${AWS_REGION}"
echo "Account ID: ${ACCOUNT_ID}"
echo "=========================================="
echo ""

# Create SNS topic for alerts (optional)
echo "Step 1: Creating SNS topic for alerts..."
SNS_TOPIC_ARN=$(aws sns create-topic \
  --name turbo-template-alerts \
  --region ${AWS_REGION} \
  --query 'TopicArn' \
  --output text)

echo "✓ SNS topic created: ${SNS_TOPIC_ARN}"

# Subscribe your email to the topic (optional)
# Uncomment and update with your email
# aws sns subscribe \
#   --topic-arn ${SNS_TOPIC_ARN} \
#   --protocol email \
#   --notification-endpoint your-email@example.com \
#   --region ${AWS_REGION}

echo "Note: To receive email alerts, subscribe to the SNS topic:"
echo "  aws sns subscribe \\"
echo "    --topic-arn ${SNS_TOPIC_ARN} \\"
echo "    --protocol email \\"
echo "    --notification-endpoint YOUR_EMAIL@example.com \\"
echo "    --region ${AWS_REGION}"
echo ""

# Create CloudWatch log groups
echo "Step 2: Creating CloudWatch log groups..."

# Web log group
aws logs create-log-group \
  --log-group-name /ecs/turbo-template-web \
  --region ${AWS_REGION} 2>/dev/null || echo "Log group already exists"

aws logs put-retention-policy \
  --log-group-name /ecs/turbo-template-web \
  --retention-in-days 7 \
  --region ${AWS_REGION}

echo "✓ Web log group created: /ecs/turbo-template-web"

# Backend log group
aws logs create-log-group \
  --log-group-name /ecs/turbo-template-backend \
  --region ${AWS_REGION} 2>/dev/null || echo "Log group already exists"

aws logs put-retention-policy \
  --log-group-name /ecs/turbo-template-backend \
  --retention-in-days 7 \
  --region ${AWS_REGION}

echo "✓ Backend log group created: /ecs/turbo-template-backend"
echo ""

# Create CloudWatch alarms
echo "Step 3: Creating CloudWatch alarms..."

# Read alarm definitions from JSON
alarm_file="aws/monitoring/cloudwatch-alarms.json"

if [ ! -f "$alarm_file" ]; then
    echo "Error: Alarm definitions file not found: ${alarm_file}"
    exit 1
fi

# Parse JSON and create alarms (using jq if available, otherwise manual creation)
if command -v jq &> /dev/null; then
    # Parse JSON using jq
    for key in $(jq -r 'keys[]' "$alarm_file"); do
        alarm_json=$(jq -r ".${key}" "$alarm_file")
        
        # Replace placeholders
        alarm_json=$(echo "$alarm_json" | sed "s/<ACCOUNT-ID>/${ACCOUNT_ID}/g")
        
        alarm_name=$(echo "$alarm_json" | jq -r '.AlarmName')
        
        echo "Creating alarm: ${alarm_name}"
        
        # Check if alarm already exists
        if aws cloudwatch describe-alarms \
          --alarm-names ${alarm_name} \
          --region ${AWS_REGION} 2>/dev/null | grep -q ${alarm_name}; then
            echo "  Alarm already exists, skipping..."
        else
            # Create alarm using AWS CLI
            echo "$alarm_json" > /tmp/alarm.json
            aws cloudwatch put-metric-alarm \
              --cli-input-json file:///tmp/alarm.json \
              --region ${AWS_REGION} > /dev/null
            echo "  ✓ Alarm created successfully"
        fi
    done
else
    echo "Warning: jq not found. Creating alarms manually..."
    echo "Install jq for automatic alarm creation: apt-get install jq (Ubuntu) or brew install jq (macOS)"
    echo ""
    echo "Alternatively, manually create alarms using the AWS Console or AWS CLI commands from cloudwatch-alarms.json"
fi

echo ""
echo "=========================================="
echo "Monitoring setup completed!"
echo "=========================================="
echo ""
echo "SNS Topic: ${SNS_TOPIC_ARN}"
echo "Log Groups:"
echo "  - /ecs/turbo-template-web"
echo "  - /ecs/turbo-template-backend"
echo ""
echo "To view logs:"
echo "  aws logs tail /ecs/turbo-template-web --follow --region ${AWS_REGION}"
echo "  aws logs tail /ecs/turbo-template-backend --follow --region ${AWS_REGION}"
echo ""
echo "To view alarms:"
echo "  aws cloudwatch describe-alarms --region ${AWS_REGION}"
echo ""
