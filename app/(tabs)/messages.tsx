import Page from '@/components/Page';
import {
  getConversations,
  getMessages,
  markMessageAsRead,
  sendMessage,
} from '@/lib/api';
import { useAuth } from '@/lib/session';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Conversation = {
  item_id: string;
  item: {
    id: string;
    title: string;
    type: 'lost' | 'found';
    status: string;
  };
  other_user_id: string;
  other_user_profile: {
    full_name: string | null;
    avatar_path: string | null;
  } | null;
  last_message: {
    id: string;
    message: string;
    created_at: string;
    sender_id: string;
  };
  unread_count: number;
};

type Message = {
  id: string;
  message: string;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  read: boolean;
};

export default function MessagesScreen() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  const loadConversations = async () => {
    if (!session) {
      setLoading(false);
      return;
    }

    try {
      const data = await getConversations(session.user.id);
      setConversations(data as Conversation[]);
    } catch (error: any) {
      console.error('Failed to load conversations:', error);
      Alert.alert('Error', 'Failed to load conversations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [session]);

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const openConversation = async (conversation: Conversation) => {
    if (!session) return;

    setSelectedConversation(conversation);
    setShowMessagesModal(true);
    setLoadingMessages(true);

    try {
      const msgs = await getMessages(conversation.item_id, session.user.id);
      setMessages(msgs);

      // Mark messages as read
      const unreadMessages = msgs.filter(
        (m: Message) => !m.read && m.receiver_id === session.user.id
      );

      for (const msg of unreadMessages) {
        try {
          await markMessageAsRead(msg.id);
        } catch (e) {
          console.error('Failed to mark message as read:', e);
        }
      }

      loadConversations(); // Refresh to update unread count
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation || !session || sending)
      return;

    setSending(true);

    try {
      await sendMessage(
        selectedConversation.item_id,
        selectedConversation.other_user_id,
        messageText
      );

      setMessageText('');

      const msgs = await getMessages(
        selectedConversation.item_id,
        session.user.id
      );
      setMessages(msgs);
      loadConversations(); // Refresh conversations
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (!session) {
    return (
      <Page>
        <View
          style={[
            styles.container,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}
        >
          <StatusBar style="dark" />
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>
              Please sign in to view messages
            </Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.loginButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Page>
    );
  }

  if (loading) {
    return (
      <Page>
        <View
          style={[
            styles.container,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}
        >
          <StatusBar style="dark" />
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#782F40" />
          </View>
        </View>
      </Page>
    );
  }

  return (
    <Page>
      <View
        style={[
          styles.container,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <StatusBar style="dark" />

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
          <Text style={styles.headerSubtitle}>
            {conversations.length} conversation
            {conversations.length !== 1 ? 's' : ''}
          </Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 80,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {conversations.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>No conversations yet</Text>
              <Text style={styles.emptySubtext}>
                Start messaging about items to see conversations here
              </Text>
            </View>
          ) : (
            conversations.map((conversation) => (
              <TouchableOpacity
                key={`${conversation.item_id}_${conversation.other_user_id}`}
                style={styles.conversationCard}
                onPress={() => openConversation(conversation)}
                activeOpacity={0.7}
              >
                <View style={styles.conversationAvatar}>
                  <Ionicons name="person" size={24} color="#782F40" />
                </View>

                <View style={styles.conversationContent}>
                  <View style={styles.conversationHeader}>
                    <Text
                      style={styles.conversationName}
                      numberOfLines={1}
                    >
                      {conversation.other_user_profile?.full_name ||
                        'Anonymous User'}
                    </Text>
                    <Text style={styles.conversationTime}>
                      {new Date(
                        conversation.last_message.created_at
                      ).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>

                  <Text
                    style={styles.conversationItemTitle}
                    numberOfLines={1}
                  >
                    {conversation.item.title}
                  </Text>

                  <Text
                    style={styles.conversationLastMessage}
                    numberOfLines={2}
                  >
                    {conversation.last_message.message}
                  </Text>
                </View>

                {conversation.unread_count > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>
                      {conversation.unread_count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Messages Modal */}
        <Modal
          visible={showMessagesModal}
          animationType="slide"
          transparent={false}
          onRequestClose={() => {
            setShowMessagesModal(false);
            setSelectedConversation(null);
            setMessages([]);
          }}
        >
          <View
            style={[
              styles.messagesContainer,
              { paddingBottom: insets.bottom },
            ]}
          >
            <View
              style={[
                styles.messagesHeader,
                { paddingTop: insets.top },
              ]}
            >
              <TouchableOpacity
                onPress={() => {
                  setShowMessagesModal(false);
                  setSelectedConversation(null);
                  setMessages([]);
                }}
                style={styles.messagesBackButton}
              >
                <Ionicons name="arrow-back" size={24} color="#1F2937" />
              </TouchableOpacity>

              <View style={styles.messagesHeaderContent}>
                <Text
                  style={styles.messagesHeaderTitle}
                  numberOfLines={1}
                >
                  {selectedConversation?.other_user_profile?.full_name ||
                    'User'}
                </Text>
                <Text
                  style={styles.messagesHeaderSubtitle}
                  numberOfLines={1}
                >
                  {selectedConversation?.item.title}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  if (selectedConversation) {
                    router.push(
                      `/(tabs)/item/${selectedConversation.item_id}`
                    );
                  }
                }}
                style={styles.messagesItemButton}
              >
                <Ionicons name="open-outline" size={24} color="#782F40" />
              </TouchableOpacity>
            </View>

            {loadingMessages ? (
              <View style={styles.messagesLoading}>
                <ActivityIndicator size="large" color="#782F40" />
              </View>
            ) : messages.length === 0 ? (
              <View style={styles.messagesEmpty}>
                <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
                <Text style={styles.messagesEmptyText}>
                  No messages yet
                </Text>
              </View>
            ) : (
              <>
                <ScrollView
                  style={styles.messagesList}
                  contentContainerStyle={styles.messagesListContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {messages.map((message) => {
                    if (!session) return null;
                    const isSent = message.sender_id === session.user.id;

                    return (
                      <View
                        key={message.id}
                        style={[
                          styles.messageBubble,
                          isSent
                            ? styles.messageBubbleSent
                            : styles.messageBubbleReceived,
                        ]}
                      >
                        <View
                          style={[
                            styles.messageContent,
                            isSent
                              ? styles.messageContentSent
                              : styles.messageContentReceived,
                          ]}
                        >
                          <Text
                            style={[
                              styles.messageText,
                              isSent
                                ? styles.messageTextSent
                                : styles.messageTextReceived,
                            ]}
                          >
                            {message.message}
                          </Text>
                          <Text
                            style={[
                              styles.messageTime,
                              isSent
                                ? styles.messageTimeSent
                                : styles.messageTimeReceived,
                            ]}
                          >
                            {new Date(
                              message.created_at
                            ).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>

                <KeyboardAvoidingView
                  behavior={
                    Platform.OS === 'ios' ? 'padding' : 'height'
                  }
                  style={[
                    styles.messagesInputContainer,
                    { paddingBottom: insets.bottom || 12 },
                  ]}
                >
                  <TextInput
                    style={styles.messagesInput}
                    placeholder="Type a message..."
                    placeholderTextColor="#9CA3AF"
                    value={messageText}
                    onChangeText={setMessageText}
                    multiline
                    maxLength={500}
                  />
                  <TouchableOpacity
                    style={[
                      styles.messagesSendButton,
                      (!messageText.trim() || sending) &&
                        styles.messagesSendButtonDisabled,
                    ]}
                    onPress={handleSendMessage}
                    disabled={!messageText.trim() || sending}
                  >
                    {sending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="send" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                </KeyboardAvoidingView>
              </>
            )}
          </View>
        </Modal>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  conversationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  conversationAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  conversationTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  conversationItemTitle: {
    fontSize: 14,
    color: '#782F40',
    fontWeight: '600',
    marginBottom: 4,
  },
  conversationLastMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  unreadBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#782F40',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#782F40',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  messagesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  messagesBackButton: {
    padding: 8,
    marginRight: 8,
  },
  messagesHeaderContent: {
    flex: 1,
  },
  messagesHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  messagesHeaderSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  messagesItemButton: {
    padding: 8,
    marginLeft: 8,
  },
  messagesLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  messagesEmptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
  },
  messagesList: {
    flex: 1,
  },
  messagesListContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageBubble: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  messageBubbleSent: {
    justifyContent: 'flex-end',
  },
  messageBubbleReceived: {
    justifyContent: 'flex-start',
  },
  messageContent: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  messageContentSent: {
    backgroundColor: '#782F40',
    borderBottomRightRadius: 4,
  },
  messageContentReceived: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  messageTextSent: {
    color: '#fff',
  },
  messageTextReceived: {
    color: '#1F2937',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 2,
  },
  messageTimeSent: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messageTimeReceived: {
    color: '#9CA3AF',
  },
  messagesInputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'flex-end',
  },
  messagesInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
    color: '#1F2937',
    marginRight: 8,
  },
  messagesSendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#782F40',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesSendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
});
