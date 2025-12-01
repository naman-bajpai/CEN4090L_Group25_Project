import Page from '@/components/Page';
import type { ItemWithProfile } from '@/lib/api';
import { claimItem, getItem, getItemImageUrl, getMessages, getProfile, markMessageAsRead, sendMessage, updateItem, type Message } from '@/lib/api';
import { useAuth } from '@/lib/session';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const [item, setItem] = useState<ItemWithProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<any>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showMessagesView, setShowMessagesView] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    loadItem();
  }, [id]);

  const loadItem = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const itemData = await getItem(id);
      setItem(itemData as ItemWithProfile);
      
      if (itemData.image_path) {
        const url = await getItemImageUrl(itemData.image_path);
        setImageUrl(url);
      }
      
      if (itemData.user_id) {
        const profile = await getProfile(itemData.user_id);
        setOwnerProfile(profile);
      }
    } catch (error: any) {
      console.error('Failed to load item:', error);
      Alert.alert('Error', error.message || 'Failed to load item details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!item || !session) return;

    Alert.alert(
      'Claim Item',
      `Are you sure this is your ${item.type === 'found' ? 'lost' : 'found'} item?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Claim It',
          onPress: async () => {
            setClaiming(true);
            try {
              await claimItem(item.id);
              Alert.alert('Success', 'Item claimed successfully!');
              loadItem();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to claim item');
            } finally {
              setClaiming(false);
            }
          },
        },
      ]
    );
  };

  const loadMessages = async () => {
    if (!item || !session) return;
    setLoadingMessages(true);
    try {
      const msgs = await getMessages(item.id, session.user.id);
      setMessages(msgs);
      
      // Mark unread messages as read
      const unreadMessages = msgs.filter(
        (m) => !m.read && m.receiver_id === session.user.id
      );
      for (const msg of unreadMessages) {
        await markMessageAsRead(msg.id);
      }
    } catch (error: any) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !item || !session) return;

    setSending(true);
    try {
      await sendMessage(item.id, item.user_id, messageText);
      Alert.alert('Success', 'Message sent successfully!');
      setMessageText('');
      setShowMessageModal(false);
      loadMessages();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleCloseItem = async () => {
    if (!item) return;
    try {
      await updateItem(item.id, { status: 'closed' });
      Alert.alert('Success', 'Item closed successfully');
      loadItem();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to close item');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#782F40" />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar style="dark" />
        <Ionicons name="alert-circle" size={48} color="#ccc" />
        <Text style={styles.emptyText}>Item not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOwner = session && item.user_id === session.user.id;
  const canClaim = !isOwner && session && item.status === 'open' && item.type === 'found';
  const canMessage = !isOwner && session && item.status === 'open';

  return (
    <Page>
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButtonHeader}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Item Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Image */}
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.itemImage} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={64} color="#9CA3AF" />
            </View>
          )}

          {/* Content */}
          <View style={styles.content}>
            {/* Title and Status */}
            <View style={styles.titleSection}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <View
                style={[
                  styles.statusBadge,
                  item.status === 'open' && styles.statusOpen,
                  item.status === 'claimed' && styles.statusClaimed,
                  item.status === 'closed' && styles.statusClosed,
                ]}
              >
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>

            {/* Type Badge */}
            <View style={styles.typeBadge}>
              <Ionicons
                name={item.type === 'lost' ? 'search' : 'checkmark-circle'}
                size={16}
                color="#782F40"
              />
              <Text style={styles.typeText}>
                {item.type === 'lost' ? 'Lost Item' : 'Found Item'}
              </Text>
            </View>

            {/* Description */}
            {item.description && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.description}>{item.description}</Text>
              </View>
            )}

            {/* Details Grid */}
            <View style={styles.detailsGrid}>
              {item.color && (
                <View style={styles.detailCard}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="color-palette" size={20} color="#782F40" />
                  </View>
                  <Text style={styles.detailLabel}>Color</Text>
                  <Text style={styles.detailValue}>{item.color}</Text>
                </View>
              )}

              {item.location && (
                <View style={styles.detailCard}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="location" size={20} color="#782F40" />
                  </View>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{item.location}</Text>
                </View>
              )}

              {item.when_lost && (
                <View style={styles.detailCard}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="calendar" size={20} color="#782F40" />
                  </View>
                  <Text style={styles.detailLabel}>
                    {item.type === 'lost' ? 'Lost On' : 'Found On'}
                  </Text>
                  <Text style={styles.detailValue}>
                    {new Date(item.when_lost).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
              )}

              <View style={styles.detailCard}>
                <View style={styles.detailIconContainer}>
                  <Ionicons name="time" size={20} color="#782F40" />
                </View>
                <Text style={styles.detailLabel}>Posted</Text>
                <Text style={styles.detailValue}>
                  {new Date(item.created_at || '').toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </View>

            {/* Owner Info */}
            {ownerProfile && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {item.type === 'found' ? 'Found By' : 'Reported By'}
                </Text>
                <View style={styles.ownerCard}>
                  <View style={styles.ownerAvatar}>
                    <Ionicons name="person" size={24} color="#782F40" />
                  </View>
                  <View style={styles.ownerInfo}>
                    <Text style={styles.ownerName}>
                      {ownerProfile.full_name || 'Anonymous User'}
                    </Text>
                    {isOwner && <Text style={styles.ownerBadge}>You</Text>}
                  </View>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Action Buttons */}
        {session && (
          <View style={[styles.actionBar, { paddingBottom: insets.bottom + 10 }]}>
            {canClaim && (
              <TouchableOpacity
                style={[styles.actionButton, styles.claimButton]}
                onPress={handleClaim}
                disabled={claiming}
              >
                {claiming ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Claim This Item</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {canMessage && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.messageButton]}
                  onPress={() => {
                    setShowMessagesView(true);
                    loadMessages();
                  }}
                >
                  <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Messages</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.messageButtonSmall]}
                  onPress={() => setShowMessageModal(true)}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </>
            )}

            {isOwner && item.status === 'open' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.closeButton]}
                onPress={() => {
                  Alert.alert(
                    'Close Item',
                    'Mark this item as closed?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Close',
                        onPress: handleCloseItem,
                      },
                    ]
                  );
                }}
              >
                <Ionicons name="close-circle" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Close Item</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Messages View Modal */}
      <Modal
        visible={showMessagesView}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowMessagesView(false)}
      >
        <View style={styles.messagesContainer}>
          <View style={[styles.messagesHeader, { paddingTop: insets.top }]}>
            <TouchableOpacity
              onPress={() => setShowMessagesView(false)}
              style={styles.messagesBackButton}
            >
              <Ionicons name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.messagesHeaderTitle}>Messages</Text>
            <TouchableOpacity
              onPress={() => {
                setShowMessagesView(false);
                setShowMessageModal(true);
              }}
              style={styles.messagesNewButton}
            >
              <Ionicons name="add" size={24} color="#782F40" />
            </TouchableOpacity>
          </View>

          {loadingMessages ? (
            <View style={styles.messagesLoading}>
              <ActivityIndicator size="large" color="#782F40" />
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.messagesEmpty}>
              <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
              <Text style={styles.messagesEmptyText}>No messages yet</Text>
              <Text style={styles.messagesEmptySubtext}>
                Start a conversation about this item
              </Text>
              <TouchableOpacity
                style={styles.messagesEmptyButton}
                onPress={() => {
                  setShowMessagesView(false);
                  setShowMessageModal(true);
                }}
              >
                <Text style={styles.messagesEmptyButtonText}>Send First Message</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <ScrollView
                style={styles.messagesList}
                contentContainerStyle={styles.messagesListContent}
              >
                {messages.map((message) => {
                  const isSent = message.sender_id === session?.user.id;
                  return (
                    <View
                      key={message.id}
                      style={[
                        styles.messageBubble,
                        isSent ? styles.messageBubbleSent : styles.messageBubbleReceived,
                      ]}
                    >
                      {!isSent && (
                        <View style={styles.messageAvatar}>
                          <Ionicons name="person" size={16} color="#782F40" />
                        </View>
                      )}
                      <View
                        style={[
                          styles.messageContent,
                          isSent ? styles.messageContentSent : styles.messageContentReceived,
                        ]}
                      >
                        <Text
                          style={[
                            styles.messageText,
                            isSent ? styles.messageTextSent : styles.messageTextReceived,
                          ]}
                        >
                          {message.message}
                        </Text>
                        <Text
                          style={[
                            styles.messageTime,
                            isSent ? styles.messageTimeSent : styles.messageTimeReceived,
                          ]}
                        >
                          {new Date(message.created_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                      {isSent && (
                        <View style={styles.messageAvatar}>
                          <Ionicons name="person" size={16} color="#fff" />
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>

              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.messagesInputContainer}
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
                    (!messageText.trim() || sending) && styles.messagesSendButtonDisabled,
                  ]}
                  onPress={async () => {
                    if (!messageText.trim() || !item || !session || sending) return;
                    setSending(true);
                    try {
                      await sendMessage(item.id, item.user_id, messageText);
                      setMessageText('');
                      loadMessages();
                    } catch (error: any) {
                      Alert.alert('Error', error.message || 'Failed to send message');
                    } finally {
                      setSending(false);
                    }
                  }}
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

      {/* New Message Modal */}
      <Modal
        visible={showMessageModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMessageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Message</Text>
              <TouchableOpacity
                onPress={() => setShowMessageModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={28} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.modalSubtitle}>
                Send a message to {ownerProfile?.full_name || 'the owner'} about this item
              </Text>

              <View style={styles.messageInputContainer}>
                <TextInput
                  style={styles.messageInput}
                  placeholder="Type your message..."
                  placeholderTextColor="#9CA3AF"
                  value={messageText}
                  onChangeText={setMessageText}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!messageText.trim() || sending) && styles.sendButtonDisabled,
                ]}
                onPress={handleSendMessage}
                disabled={!messageText.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="#fff" />
                    <Text style={styles.sendButtonText}>Send Message</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
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
  flex: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButtonHeader: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginRight: 40,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  itemImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#F3F4F6',
  },
  imagePlaceholder: {
    width: '100%',
    height: 300,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  itemTitle: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 12,
  },
  statusOpen: {
    backgroundColor: '#DCFCE7',
  },
  statusClaimed: {
    backgroundColor: '#FEF3C7',
  },
  statusClosed: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
    textTransform: 'uppercase',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    marginBottom: 20,
    gap: 6,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#782F40',
    textTransform: 'capitalize',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4B5563',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  detailCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ownerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ownerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  ownerBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#782F40',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: 'transparent',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  messageButtonSmall: {
    flex: 0,
    minWidth: 50,
    paddingHorizontal: 16,
  },
  claimButton: {
    backgroundColor: '#10B981',
  },
  messageButton: {
    backgroundColor: '#782F40',
  },
  closeButton: {
    backgroundColor: '#6B7280',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#782F40',
    borderRadius: 10,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalContent: {
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  messageInputContainer: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    marginBottom: 20,
  },
  messageInput: {
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 120,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#782F40',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  messagesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  messagesBackButton: {
    padding: 8,
  },
  messagesHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  messagesNewButton: {
    padding: 8,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  messagesEmptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  messagesEmptyButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#782F40',
    borderRadius: 12,
  },
  messagesEmptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  messagesList: {
    flex: 1,
  },
  messagesListContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  messageBubbleSent: {
    justifyContent: 'flex-end',
  },
  messageBubbleReceived: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  messageContent: {
    maxWidth: '75%',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  },
  messageTextSent: {
    color: '#fff',
  },
  messageTextReceived: {
    color: '#1F2937',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  messageTimeSent: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messageTimeReceived: {
    color: '#9CA3AF',
  },
  messagesInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  messagesInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1F2937',
    maxHeight: 100,
    backgroundColor: '#FAFAFA',
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
