<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ serviceName }}</ion-title>
        <ion-buttons slot="start">
          <ion-back-button default-href="/scanner"></ion-back-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <ion-card>
        <ion-card-header>
          <ion-card-title>Connection Status</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div class="connection-info">
            <div class="status-row">
              <ion-badge 
                :color="connectionStatusColor"
                class="status-badge"
              >
                <ion-icon 
                  v-if="connecting" 
                  :icon="syncOutline" 
                  class="spinning-icon"
                ></ion-icon>
                <ion-icon 
                  v-else-if="connected" 
                  :icon="checkmarkCircleOutline"
                ></ion-icon>
                <ion-icon 
                  v-else 
                  :icon="closeCircleOutline"
                ></ion-icon>
                {{ connectionStatusText }}
              </ion-badge>
            </div>
            <div class="broker-info">
              <ion-text color="medium">
                <p class="broker-url">{{ brokerUrl }}</p>
              </ion-text>
            </div>
            <div class="connection-controls">
              <ion-button
                :color="connected ? 'danger' : 'primary'"
                @click="connected ? disconnectClient() : connectToMQTT()"
                :disabled="connecting"
                expand="block"
              >
                <ion-icon 
                  :icon="connected ? powerOutline : playOutline" 
                  slot="start"
                ></ion-icon>
                {{ connected ? 'Disconnect' : connecting ? 'Connecting...' : 'Connect' }}
              </ion-button>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-card v-if="error" color="danger">
        <ion-card-content>
          <div class="error-content">
            <ion-text color="light">
              <p>{{ error }}</p>
            </ion-text>
            <ion-button 
              fill="clear" 
              color="light" 
              size="small"
              @click="error = null"
            >
              <ion-icon :icon="closeOutline"></ion-icon>
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-card v-if="connecting">
        <ion-card-content>
          <div class="loading-content">
            <ion-spinner name="circles"></ion-spinner>
            <ion-text color="medium">
              <p>Connecting to MQTT broker...</p>
            </ion-text>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Message publishing section -->
      <ion-card v-if="connected">
        <ion-card-header>
          <ion-card-title>Publish Message</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div class="publish-controls">
            <ion-input
              v-model="publishTopic"
              placeholder="Topic (e.g., test/topic)"
              fill="outline"
              label="Topic"
              label-placement="stacked"
            ></ion-input>
            
            <ion-textarea
              v-model="publishMessage"
              placeholder="Message payload"
              fill="outline"
              label="Message"
              label-placement="stacked"
              :rows="3"
            ></ion-textarea>
            
            <ion-button 
              @click="publishMessageToTopic" 
              expand="block"
              color="warning"
            >
              <ion-icon :icon="sendOutline" slot="start"></ion-icon>
              Publish
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-card>
        <ion-card-header>
          <ion-card-title>Messages ({{ messages.length }})</ion-card-title>
          <ion-button 
            v-if="messages.length > 0"
            fill="outline" 
            size="small"
            @click="clearMessages"
            slot="end"
          >
            <ion-icon :icon="trashOutline" slot="start"></ion-icon>
            Clear
          </ion-button>
        </ion-card-header>
        <ion-card-content>
          <ion-text v-if="messages.length === 0" color="medium" class="empty-messages">
            <div class="empty-content">
              <ion-icon :icon="chatbubbleOutline" size="large"></ion-icon>
              <p>{{ connected ? 'Waiting for messages...' : 'Connect to start receiving messages' }}</p>
            </div>
          </ion-text>

          <ion-list v-if="messages.length > 0" class="messages-list">
            <ion-item
              v-for="message in messages"
              :key="message.id"
              :class="{ 'system-message': message.topic === 'system' }"
            >
              <ion-label>
                <div class="message-header">
                  <ion-chip 
                    :color="message.topic === 'system' ? 'medium' : 'primary'"
                    size="small"
                  >
                    {{ message.topic }}
                  </ion-chip>
                  <ion-text color="medium" class="message-timestamp">
                    {{ message.timestamp }}
                  </ion-text>
                </div>
                <div class="message-payload">
                  <pre>{{ message.payload }}</pre>
                </div>
              </ion-label>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonBackButton, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonButton, IonIcon, IonBadge, IonText, IonSpinner, IonInput,
  IonTextarea, IonList, IonItem, IonLabel, IonChip
} from '@ionic/vue'
import { 
  syncOutline, 
  sendOutline, 
  powerOutline, 
  closeCircleOutline, 
  playOutline, 
  trashOutline, 
  chatbubbleOutline,
  checkmarkCircleOutline,
  closeOutline
} from 'ionicons/icons';

import mqtt from 'mqtt'

interface Service {
  name: string
  type: string
  host: string
  port: number
  discovered: boolean
  txtRecord: Record<string, any>
}

interface Message {
  id: string
  topic: string
  payload: string
  timestamp: string
}

const route = useRoute()

// Read service info from query parameters
const service: Service = {
  name: (route.query.name as string) || 'Unknown Service',
  type: (route.query.type as string) || '_mqtt._tcp.',
  host: (route.query.host as string) || 'localhost',
  port: parseInt((route.query.port as string) || '1883'),
  discovered: route.query.discovered === 'true',
  txtRecord: route.query.txtRecord ? JSON.parse(route.query.txtRecord as string) : {}
}

const connected = ref(false)
const connecting = ref(false)
const messages = ref<Message[]>([])
const error = ref<string | null>(null)
const publishTopic = ref('test/topic')
const publishMessage = ref('Hello, MQTT!')
let mqttClient: any = null

const serviceName = computed(() => service.name || 'MQTT Service')

const connectionStatusText = computed(() => {
  if (connecting.value) return 'Connecting...'
  if (connected.value) return 'Connected'
  return 'Disconnected'
})

const connectionStatusColor = computed(() => {
  if (connecting.value) return 'warning'
  if (connected.value) return 'success'
  return 'danger'
})

const wsPatterns = ['_mqtt-ws._tcp.', '_mqtt-wss._tcp.', '._mqtt-ws._tcp', '._mqtt-wss._tcp']
const tlsPatterns = ['_mqtts._tcp.', '_mqtt-wss._tcp.', '._mqtts._tcp.', '._mqtt-wss._tcp.']

const brokerUrl = computed(() => {
  const isWebSocket = wsPatterns.some(pattern => service.type.includes(pattern))
  const isTls = tlsPatterns.some(pattern => service.type.includes(pattern))

  if (isWebSocket) {
    const protocol = isTls ? 'wss' : 'ws'
    return `${protocol}://${service.host}:${service.port}`
  } else {
    const protocol = isTls ? 'mqtts' : 'mqtt'
    return `${protocol}://${service.host}:${service.port}`
  }
})

const connectToMQTT = async () => {
  connecting.value = true
  error.value = null

  try {
    console.log('Connecting to:', brokerUrl.value)

    const options = {
      clientId: `mqtt_vue_${Math.random().toString(16).substring(2, 10)}`,
      username: '',
      password: '',
      clean: true,
      connectTimeout: 10000,
      reconnectPeriod: 0, // Disable auto-reconnect for cleaner error handling
    }

    // For WebSocket connections, we need special handling
    const isWebSocket = wsPatterns.some(pattern => service.type.includes(pattern))
    if (isWebSocket) {
      // Use txtRecord path if available, otherwise default to '/mqtt'
      const wsPath = service.txtRecord?.path || '/mqtt'
      const wsUrl = `${brokerUrl.value}${wsPath}`
      console.log('WebSocket path from txtRecord:', wsPath)
      mqttClient = mqtt.connect(wsUrl, options)
    } else {
      mqttClient = mqtt.connect(brokerUrl.value, options)
    }

    mqttClient.on('connect', () => {
      console.log('Connected to MQTT broker')
      connected.value = true
      connecting.value = false

      // Subscribe to all topics
      mqttClient.subscribe('#', (err: any) => {
        if (err) {
          error.value = `Failed to subscribe: ${err.message}`
        } else {
          addMessage('system', 'Connected and subscribed to all topics (#)')
        }
      })
    })

    mqttClient.on('error', (err: any) => {
      console.error('MQTT connection error:', err)
      error.value = `Connection failed: ${err.message || 'Unknown error'}`
      connecting.value = false
      connected.value = false
    })

    mqttClient.on('close', () => {
      console.log('MQTT connection closed')
      connected.value = false
      connecting.value = false
      addMessage('system', 'Connection closed')
    })

    mqttClient.on('message', (topic: string, message: Buffer) => {
      let payload: string
      try {
        const messageStr = message.toString()
        // Try to parse as JSON for pretty printing
        const parsed = JSON.parse(messageStr)
        payload = JSON.stringify(parsed, null, 2)
      } catch (e) {
        payload = message.toString()
      }
      addMessage(topic, payload)
    })

    // Set a timeout for connection
    setTimeout(() => {
      if (connecting.value) {
        error.value = 'Connection timeout - please check the broker address and port'
        connecting.value = false
        if (mqttClient) {
          mqttClient.end(true)
        }
      }
    }, 15000)

  } catch (err: any) {
    error.value = `Connection failed: ${err.message}`
    connecting.value = false
  }
}

const disconnectClient = () => {
  if (mqttClient) {
    mqttClient.end()
    mqttClient = null
  }
  connected.value = false
  addMessage('system', 'Disconnected from broker')
}

const publishMessageToTopic = () => {
  if (mqttClient && connected.value && publishTopic.value && publishMessage.value) {
    mqttClient.publish(publishTopic.value, publishMessage.value, (err: any) => {
      if (err) {
        error.value = `Failed to publish: ${err.message}`
      } else {
        addMessage('system', `Published to ${publishTopic.value}: ${publishMessage.value}`)
      }
    })
  }
}

const addMessage = (topic: string, payload: string) => {
  const timestamp = new Date().toLocaleTimeString()
  const newMessage: Message = {
    id: `${timestamp}-${Math.random().toString(16).substring(2, 10)}`,
    topic,
    payload,
    timestamp
  }

  messages.value = [newMessage, ...messages.value].slice(0, 500) // Keep last 500 messages
}

const clearMessages = () => {
  messages.value = []
}

onMounted(() => {
  addMessage('system', `Configured for ${serviceName.value}`)
  // Don't auto-connect, let user initiate
})

onUnmounted(() => {
  disconnectClient()
})
</script>

<style scoped>
.connection-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-row {
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 16px;
  font-weight: 600;
}

.spinning-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.broker-info {
  text-align: center;
}

.broker-url {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Source Code Pro', monospace;
  font-size: 0.9rem;
  margin: 0;
  word-break: break-all;
}

.connection-controls {
  margin-top: 16px;
}

.error-content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.error-content p {
  margin: 0;
  flex: 1;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 20px;
}

.loading-content p {
  margin: 0;
  text-align: center;
}

.publish-controls {
  display: grid;
  gap: 16px;
}

.empty-messages {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  text-align: center;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.empty-content p {
  margin: 0;
}

.messages-list {
  margin: 0;
  padding: 0;
}

.system-message {
  --ion-item-background: var(--ion-color-light);
}

.message-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 12px;
}

.message-timestamp {
  font-size: 0.8rem;
  white-space: nowrap;
}

.message-payload {
  margin: 0;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Source Code Pro', monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--ion-color-light);
  padding: 12px;
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .message-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .broker-url {
    font-size: 0.8rem;
  }
}
</style>

