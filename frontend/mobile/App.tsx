import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  MobileApi,
  MobileChatMessage,
  MobileMemory,
  MobileTask,
  MobileUserProfile
} from './src/services/api';

type ActiveTab = 'chat' | 'tasks' | 'memory' | 'settings';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<MobileUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');

  // MFA challenge state
  const [mfaChallengeToken, setMfaChallengeToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [submittingAuth, setSubmittingAuth] = useState(false);

  // App state
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MobileChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  const [tasks, setTasks] = useState<MobileTask[]>([]);
  const [taskInput, setTaskInput] = useState('');
  const [memories, setMemories] = useState<MobileMemory[]>([]);

  const hydrateSession = async () => {
    try {
      const profile = await MobileApi.getMe();
      setUser(profile);

      const [convs, loadedTasks, loadedMemories] = await Promise.all([
        MobileApi.getConversations().catch(() => []),
        MobileApi.getTasks().catch(() => []),
        MobileApi.getMemories().catch(() => [])
      ]);

      setTasks(loadedTasks);
      setMemories(loadedMemories);

      if (convs.length > 0) {
        setConversationId(convs[0].id);
        const history = await MobileApi.getMessages(convs[0].id).catch(() => []);
        setMessages(history);
      }
    } catch {
      await MobileApi.setToken(null);
      setToken(null);
      setUser(null);
    }
  };

  useEffect(() => {
    MobileApi.getToken()
      .then(async t => {
        setToken(t);
        if (t) {
          await hydrateSession();
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Validation', 'Email and password are required.');
      return;
    }
    setSubmittingAuth(true);
    try {
      const res = await MobileApi.login(email.trim(), password);
      if (res.mfaRequired && res.mfaChallengeToken) {
        setMfaChallengeToken(res.mfaChallengeToken);
        return;
      }
      if (res.token) {
        setToken(res.token);
        await hydrateSession();
      }
    } catch (err) {
      Alert.alert('Login Failed', (err as Error).message);
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleMfaVerify = async () => {
    if (!mfaChallengeToken || mfaCode.trim().length < 6) {
      Alert.alert('MFA Code', 'Enter your 6-digit authenticator or recovery code.');
      return;
    }
    setSubmittingAuth(true);
    try {
      const res = await MobileApi.verifyMfaChallenge(mfaChallengeToken, mfaCode.trim());
      setMfaChallengeToken(null);
      setMfaCode('');
      setToken(res.token);
      setUser(res.user);
      await hydrateSession();
    } catch (err) {
      Alert.alert('MFA Verification Failed', (err as Error).message);
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleSignup = async () => {
    if (!email.trim() || !password || !name.trim() || !username.trim()) {
      Alert.alert('Validation', 'Please fill out all fields.');
      return;
    }
    setSubmittingAuth(true);
    try {
      const res = await MobileApi.signup(email.trim(), password, name.trim(), username.trim());
      setToken(res.token);
      setUser(res.user);
      await hydrateSession();
    } catch (err) {
      Alert.alert('Signup Failed', (err as Error).message);
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleLogout = async () => {
    await MobileApi.logout(false);
    setToken(null);
    setUser(null);
    setConversationId(null);
    setMessages([]);
    setTasks([]);
    setMemories([]);
  };

  const handleSendMessage = async () => {
    const trimmed = inputMsg.trim();
    if (!trimmed || sendingChat) return;

    const tempUserId = `user-${Date.now()}`;
    const tempAssistantId = `assistant-${Date.now() + 1}`;

    setInputMsg('');
    setSendingChat(true);
    setMessages(prev => [...prev, { id: tempUserId, role: 'user', content: trimmed }]);

    try {
      let convId = conversationId;
      if (!convId) {
        const created = await MobileApi.createConversation(
          trimmed.slice(0, 40),
          user?.preferences?.defaultPersonalityMode || 'tapori',
          'chhotu'
        );
        convId = created.id;
        setConversationId(convId);
      }

      const reply = await MobileApi.sendChatStream(
        convId,
        trimmed,
        user?.preferences?.defaultPersonalityMode || 'tapori',
        'chhotu',
        partial => {
          setMessages(prev => {
            const exists = prev.some(m => m.id === tempAssistantId);
            if (exists) {
              return prev.map(m => (m.id === tempAssistantId ? { ...m, content: partial } : m));
            }
            return [...prev, { id: tempAssistantId, role: 'assistant', content: partial }];
          });
        }
      );

      setMessages(prev => {
        const exists = prev.some(m => m.id === tempAssistantId);
        if (exists) {
          return prev.map(m => (m.id === tempAssistantId ? { ...m, content: reply } : m));
        }
        return [...prev, { id: tempAssistantId, role: 'assistant', content: reply }];
      });
    } catch (err) {
      Alert.alert('Chat Error', (err as Error).message || 'Could not reach BANTAI backend.');
    } finally {
      setSendingChat(false);
    }
  };

  const handleAddTask = async () => {
    const title = taskInput.trim();
    if (!title) return;
    setTaskInput('');
    try {
      const created = await MobileApi.createTask(title);
      setTasks(prev => [created, ...prev]);
    } catch (err) {
      Alert.alert('Task Error', (err as Error).message);
    }
  };

  const handleToggleTask = async (task: MobileTask) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const updated = await MobileApi.updateTaskStatus(task.id, nextStatus);
      setTasks(prev => prev.map(t => (t.id === task.id ? updated : t)));
    } catch (err) {
      Alert.alert('Task Error', (err as Error).message);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await MobileApi.deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      Alert.alert('Task Error', (err as Error).message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Initializing BANTAI Mobile...</Text>
      </SafeAreaView>
    );
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar style="light" />
        <View style={styles.card}>
          <Text style={styles.logoTitle}>BANTAI AI</Text>
          <Text style={styles.logoSubtitle}>Apna Model. Apna Dimaag.</Text>

          {mfaChallengeToken ? (
            <>
              <Text style={styles.infoBanner}>
                Enter the 6-digit code from your authenticator app or a recovery code.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="123456 or XXXX-XXXX"
                placeholderTextColor="#64748b"
                value={mfaCode}
                onChangeText={setMfaCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={styles.primaryBtn}
                disabled={submittingAuth}
                onPress={handleMfaVerify}
              >
                <Text style={styles.primaryBtnText}>
                  {submittingAuth ? 'Verifying...' : 'Verify MFA Code'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setMfaChallengeToken(null);
                  setMfaCode('');
                }}
              >
                <Text style={styles.switchText}>Back to login</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {authMode === 'signup' && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    placeholderTextColor="#64748b"
                    value={name}
                    onChangeText={setName}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Username"
                    placeholderTextColor="#64748b"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />
                </>
              )}
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="#64748b"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#64748b"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <TouchableOpacity
                style={styles.primaryBtn}
                disabled={submittingAuth}
                onPress={authMode === 'login' ? handleLogin : handleSignup}
              >
                <Text style={styles.primaryBtnText}>
                  {submittingAuth ? 'Authenticating...' : authMode === 'login' ? 'Sign In' : 'Create Account'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setAuthMode(m => (m === 'login' ? 'signup' : 'login'))}>
                <Text style={styles.switchText}>
                  {authMode === 'login' ? "Don't have an account? Sign Up" : 'Already registered? Sign In'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>BANTAI</Text>
          <Text style={styles.headerSub}>Local Sovereign AI · {user?.name || 'Mobile'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.body}>
        {activeTab === 'chat' && (
          <View style={styles.flexOne}>
            <ScrollView style={styles.messagesList} contentContainerStyle={{ paddingBottom: 16 }}>
              {messages.length === 0 ? (
                <Text style={styles.emptyText}>
                  Bol bantai! Messages stream straight from your private BANTAI backend.
                </Text>
              ) : (
                messages.map(m => (
                  <View
                    key={m.id}
                    style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.botBubble]}
                  >
                    <Text style={styles.bubbleText}>{m.content}</Text>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.composer}>
              <TextInput
                style={styles.composerInput}
                placeholder="Ask BANTAI anything..."
                placeholderTextColor="#64748b"
                value={inputMsg}
                onChangeText={setInputMsg}
              />
              <TouchableOpacity
                style={[styles.sendBtn, sendingChat && { opacity: 0.5 }]}
                disabled={sendingChat}
                onPress={handleSendMessage}
              >
                <Text style={styles.sendText}>{sendingChat ? '...' : 'Send'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeTab === 'tasks' && (
          <View style={styles.flexOne}>
            <View style={styles.composer}>
              <TextInput
                style={styles.composerInput}
                placeholder="New task title..."
                placeholderTextColor="#64748b"
                value={taskInput}
                onChangeText={setTaskInput}
              />
              <TouchableOpacity style={styles.sendBtn} onPress={handleAddTask}>
                <Text style={styles.sendText}>Add</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.messagesList}>
              {tasks.length === 0 ? (
                <Text style={styles.emptyText}>No tasks yet. Create one above.</Text>
              ) : (
                tasks.map(t => (
                  <View key={t.id} style={styles.taskCard}>
                    <TouchableOpacity style={styles.flexOne} onPress={() => handleToggleTask(t)}>
                      <Text
                        style={[
                          styles.taskTitle,
                          t.status === 'completed' && { textDecorationLine: 'line-through', color: '#64748b' }
                        ]}
                      >
                        {t.status === 'completed' ? '[Done] ' : '[ ] '}
                        {t.title}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteTask(t.id)}>
                      <Text style={styles.deleteText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        )}

        {activeTab === 'memory' && (
          <ScrollView style={styles.messagesList}>
            {memories.length === 0 ? (
              <Text style={styles.emptyText}>No persistent memories stored yet.</Text>
            ) : (
              memories.map(mem => (
                <View key={mem.id} style={styles.taskCard}>
                  <View style={styles.flexOne}>
                    <Text style={styles.memCategory}>{mem.category.toUpperCase()}</Text>
                    <Text style={styles.taskTitle}>{mem.content}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {activeTab === 'settings' && (
          <View style={styles.settingsBox}>
            <Text style={styles.taskTitle}>Account: {user?.email}</Text>
            <Text style={styles.headerSub}>Username: @{user?.username}</Text>
            <Text style={styles.headerSub}>
              MFA Status: {user?.mfaEnabled ? 'Enabled (Protected)' : 'Disabled'}
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        {(['chat', 'tasks', 'memory', 'settings'] as ActiveTab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  container: { flex: 1, backgroundColor: '#07070f' },
  center: { flex: 1, backgroundColor: '#07070f', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#94a3b8', marginTop: 12, fontSize: 13 },
  authContainer: { flex: 1, backgroundColor: '#07070f', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#0f0f1a', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#1e293b' },
  logoTitle: { color: '#ffffff', fontSize: 26, fontWeight: '800', textAlign: 'center' },
  logoSubtitle: { color: '#22d3ee', fontSize: 12, textAlign: 'center', marginBottom: 20 },
  infoBanner: { color: '#cbd5e1', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  input: {
    backgroundColor: '#07070f',
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    fontSize: 14
  },
  primaryBtn: { backgroundColor: '#6366f1', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  primaryBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  switchText: { color: '#818cf8', textAlign: 'center', marginTop: 16, fontSize: 13 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b'
  },
  headerTitle: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  headerSub: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  logoutBtn: { backgroundColor: '#1e1b4b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  logoutText: { color: '#c7d2fe', fontSize: 12, fontWeight: '600' },
  body: { flex: 1 },
  messagesList: { flex: 1, padding: 14 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 40, fontSize: 13 },
  bubble: { padding: 12, borderRadius: 14, marginBottom: 10, maxWidth: '85%' },
  userBubble: { backgroundColor: '#312e81', alignSelf: 'flex-end' },
  botBubble: { backgroundColor: '#0f0f1a', borderWidth: 1, borderColor: '#1e293b', alignSelf: 'flex-start' },
  bubbleText: { color: '#f8fafc', fontSize: 14, lineHeight: 20 },
  composer: {
    flexDirection: 'row',
    padding: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#0b0b15'
  },
  composerInput: {
    flex: 1,
    backgroundColor: '#07070f',
    color: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#334155'
  },
  sendBtn: { backgroundColor: '#6366f1', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  sendText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f0f1a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e293b'
  },
  taskTitle: { color: '#f8fafc', fontSize: 14 },
  deleteText: { color: '#f87171', fontSize: 12, fontWeight: '600', marginLeft: 12 },
  memCategory: { color: '#22d3ee', fontSize: 10, fontWeight: '700', marginBottom: 4 },
  settingsBox: { padding: 20, gap: 8 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#0b0b15'
  },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabItemActive: { borderTopWidth: 2, borderTopColor: '#6366f1' },
  tabLabel: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  tabLabelActive: { color: '#ffffff' }
});
