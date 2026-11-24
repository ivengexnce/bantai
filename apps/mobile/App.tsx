import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { MobileApi } from './src/services/api';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'tasks' | 'settings'>('chat');

  // Auth form state
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<Array<{ id: string; role: string; content: string }>>([
    { id: '1', role: 'assistant', content: 'Arey bantai! Mobile pe bhi apun active hai. Bol kya scene hai aaj?' }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [mode, setMode] = useState('tapori');
  const [selectedModel, setSelectedModel] = useState<'chhotu' | 'bhai'>('bhai');

  const modelLabels = {
    chhotu: '⚡ Chhotu',
    bhai: '🤝 Bhai'
  };

  const cycleModel = () => {
    const list: Array<'chhotu' | 'bhai'> = ['chhotu', 'bhai'];
    const nextIdx = (list.indexOf(selectedModel) + 1) % list.length;
    setSelectedModel(list[nextIdx]);
  };

  // Tasks state
  const [tasks, setTasks] = useState<Array<{ id: string; title: string; status: string }>>([]);
  const [taskInput, setTaskInput] = useState('');

  useEffect(() => {
    MobileApi.getToken().then(t => {
      setToken(t);
      setLoading(false);
    });
  }, []);

  const handleAuth = async () => {
    setAuthError(null);
    try {
      if (isLogin) {
        const res = await MobileApi.request('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        await MobileApi.setToken(res.token);
        setToken(res.token);
      } else {
        const res = await MobileApi.request('/auth/signup', {
          method: 'POST',
          body: JSON.stringify({ email, password, name, username })
        });
        await MobileApi.setToken(res.token);
        setToken(res.token);
      }
    } catch (err) {
      setAuthError((err as Error).message);
    }
  };

  const handleSendMessage = () => {
    if (!inputMsg.trim()) return;
    const newMsg = { id: String(Date.now()), role: 'user', content: inputMsg };
    setMessages(prev => [...prev, newMsg]);
    setInputMsg('');

    // Simulate response in mobile client
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          content: `Ek number bantai! Android device se seedha local model bol raha hai. Apun ne '${newMsg.content}' note kar liya hai!`
        }
      ]);
    }, 400);
  };

  const handleAddTask = () => {
    if (!taskInput.trim()) return;
    setTasks(prev => [...prev, { id: String(Date.now()), title: taskInput, status: 'pending' }]);
    setTaskInput('');
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#cc8e25" />
      </View>
    );
  }

  // Auth Screen
  if (!token) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.authBox}>
          <Text style={styles.brandTitle}>BANTAI</Text>
          <Text style={styles.tagline}>Apna Model. Apna Dimaag. Apna AI.</Text>
          <Text style={styles.subTagline}>100% Self-Hosted Android Mobile Client</Text>

          {authError && <Text style={styles.errorText}>{authError}</Text>}

          {!isLogin && (
            <>
              <TextInput
                placeholder="Full Name"
                placeholderTextColor="#666"
                style={styles.input}
                value={name}
                onChangeText={setName}
              />
              <TextInput
                placeholder="Username"
                placeholderTextColor="#666"
                style={styles.input}
                value={username}
                onChangeText={setUsername}
              />
            </>
          )}

          <TextInput
            placeholder="Email Address"
            placeholderTextColor="#666"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor="#666"
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity style={styles.goldButton} onPress={handleAuth}>
            <Text style={styles.goldButtonText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={{ marginTop: 16 }}>
            <Text style={styles.switchAuthText}>
              {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Authenticated Main Mobile App
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>BANTAI</Text>
        <TouchableOpacity onPress={cycleModel} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.headerMode}>{modelLabels[selectedModel]}</Text>
          <Text style={{ color: '#888', fontSize: 10 }}>({mode})</Text>
        </TouchableOpacity>
      </View>

      {/* Screen Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {activeTab === 'chat' && (
          <View style={{ flex: 1, padding: 12 }}>
            <FlatList
              data={messages}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={[
                  styles.msgBubble,
                  item.role === 'user' ? styles.userBubble : styles.assistantBubble
                ]}>
                  <Text style={[styles.msgText, item.role === 'user' ? { color: '#000' } : { color: '#fff' }]}>
                    {item.content}
                  </Text>
                </View>
              )}
            />

            <View style={styles.inputRow}>
              <TextInput
                placeholder="Message BANTAI..."
                placeholderTextColor="#666"
                style={styles.chatInput}
                value={inputMsg}
                onChangeText={setInputMsg}
              />
              <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
                <Text style={styles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeTab === 'tasks' && (
          <View style={{ flex: 1, padding: 16 }}>
            <Text style={styles.sectionTitle}>Personal Assistant Tasks</Text>
            <View style={styles.inputRow}>
              <TextInput
                placeholder="Add a new task..."
                placeholderTextColor="#666"
                style={styles.chatInput}
                value={taskInput}
                onChangeText={setTaskInput}
              />
              <TouchableOpacity style={styles.sendButton} onPress={handleAddTask}>
                <Text style={styles.sendButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={tasks}
              keyExtractor={t => t.id}
              renderItem={({ item }) => (
                <View style={styles.taskItem}>
                  <Text style={{ color: '#fff', fontSize: 13 }}>{item.title}</Text>
                  <Text style={{ color: '#cc8e25', fontSize: 11 }}>{item.status.toUpperCase()}</Text>
                </View>
              )}
            />
          </View>
        )}

        {activeTab === 'settings' && (
          <View style={{ flex: 1, padding: 20 }}>
            <Text style={styles.sectionTitle}>Settings & Privacy</Text>
            <Text style={{ color: '#aaa', fontSize: 12, marginBottom: 16 }}>
              Personal Memory: User Isolated (Enabled)
            </Text>
            <Text style={{ color: '#aaa', fontSize: 12, marginBottom: 16 }}>
              Cross-User Model Training: Strict Opt-In (Disabled)
            </Text>
            <TouchableOpacity
              style={[styles.goldButton, { backgroundColor: '#c00' }]}
              onPress={() => {
                MobileApi.setToken(null);
                setToken(null);
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Bottom Tabs */}
      <View style={styles.bottomNav}>
        {(['chat', 'tasks', 'settings'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={styles.tabButton}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1117'
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0f1117',
    justifyContent: 'center',
    alignItems: 'center'
  },
  authBox: {
    flex: 1,
    padding: 24,
    justifyContent: 'center'
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center'
  },
  tagline: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#cc8e25',
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 1
  },
  subTagline: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24
  },
  input: {
    backgroundColor: '#1a1d27',
    borderColor: '#282d3d',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 14,
    marginBottom: 12
  },
  goldButton: {
    backgroundColor: '#cc8e25',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8
  },
  goldButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14
  },
  switchAuthText: {
    color: '#aaa',
    fontSize: 12,
    textAlign: 'center'
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12
  },
  header: {
    height: 50,
    borderBottomColor: '#282d3d',
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16
  },
  headerTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  headerMode: {
    color: '#cc8e25',
    fontSize: 11,
    fontWeight: '600'
  },
  msgBubble: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    maxWidth: '85%'
  },
  userBubble: {
    backgroundColor: '#cc8e25',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4
  },
  assistantBubble: {
    backgroundColor: '#1a1d27',
    borderColor: '#282d3d',
    borderWidth: 1,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4
  },
  msgText: {
    fontSize: 13,
    lineHeight: 18
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#1a1d27',
    borderColor: '#282d3d',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 13
  },
  sendButton: {
    backgroundColor: '#cc8e25',
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center'
  },
  sendButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 13
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12
  },
  taskItem: {
    backgroundColor: '#1a1d27',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  bottomNav: {
    height: 56,
    borderTopColor: '#282d3d',
    borderTopWidth: 1,
    flexDirection: 'row'
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  tabText: {
    color: '#777',
    fontSize: 11,
    fontWeight: '600'
  },
  activeTabText: {
    color: '#cc8e25'
  }
});
