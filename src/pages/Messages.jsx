import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CallIcon from "@mui/icons-material/Call";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import EditIcon from "@mui/icons-material/Edit";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import SendIcon from "@mui/icons-material/Send";
import VisibilityIcon from "@mui/icons-material/Visibility";

import { useSearchParams } from "react-router-dom";

import { supabase } from "../lib/supabase";
import CustomerDialog from "../components/customers/CustomerDialog";
import CustomerProfileDrawer from "../components/customers/CustomerProfileDrawer";

const BRAND_GREEN = "#1B5E20";
const LIGHT_GREEN = "#E8F5E9";
const PAGE_BACKGROUND = "#f5f7fa";
const CRM_MESSAGE_ENDPOINT =
  "https://ugtqsmrgwnyxzuwrolcz.supabase.co/functions/v1/send-crm-message";

const QUICK_REPLIES = [
  "Thanks for reaching out! How can we help?",
  "We’re currently out providing relief, but we’ll get back to you shortly.",
  "Absolutely! What day works best for you?",
  "We’re running about 15 minutes behind. Thank you for your patience!",
  "Please make sure we can safely access the yard. Thank you!",
  "Thank you for choosing Backyard Relief! 🐾",
];

function normalizePhone(value = "") {
  const digits = String(value).replace(/\D/g, "");

  // Remove leading US country code so
  // +13034825293 matches 3034825293
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }

  return digits;
}

function normalizePhoneForApi(value = "") {
  const digits = normalizePhone(value);

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  return "";
}

function formatPhone(value = "") {
  const digits = normalizePhone(value);

  if (
    digits.length === 11 &&
    digits.startsWith("1")
  ) {
    return `(${digits.slice(1, 4)}) ${digits.slice(
      4,
      7
    )}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(
      3,
      6
    )}-${digits.slice(6)}`;
  }

  return value || "Unknown number";
}

function getCustomer(message) {
  if (!message?.customers) {
    return null;
  }

  if (Array.isArray(message.customers)) {
    return message.customers[0] ?? null;
  }

  return message.customers;
}

function getCustomerName(customer) {
  if (!customer) {
    return "";
  }

  return [
    customer.first_name,
    customer.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function getConversationPhone(message) {
  return message.direction === "outbound"
    ? message.to_phone
    : message.from_phone;
}

function formatConversationDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();

  const sameDay =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate();

  if (sameDay) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  const difference =
    now.getTime() - date.getTime();

  const sevenDays =
    7 * 24 * 60 * 60 * 1000;

  if (difference < sevenDays) {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatMessageTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatServiceDays(customer) {
  if (!customer) {
    return "";
  }

  if (
    Array.isArray(customer.service_days) &&
    customer.service_days.length > 0
  ) {
    return customer.service_days.join(" & ");
  }

  return customer.service_day || "";
}

function formatStatus(value) {
  if (!value) {
    return "Unknown";
  }

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function getStatusChipColor(value) {
  const status = String(value || "")
    .trim()
    .toLowerCase();

  if (
    status === "active" ||
    status === "trialing"
  ) {
    return "success";
  }

  if (
    status === "past_due" ||
    status === "unpaid"
  ) {
    return "warning";
  }

  if (
    status === "canceled" ||
    status === "cancelled" ||
    status === "inactive"
  ) {
    return "error";
  }

  return "default";
}

function getInitials(name, phone) {
  if (name) {
    const parts = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    return parts
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase();
  }

  const digits = normalizePhone(phone);

  return digits.slice(-2) || "?";
}

function getMediaItems(message) {
  if (!Array.isArray(message?.media_urls)) {
    return [];
  }

  return message.media_urls.filter(
    (item) => item?.url
  );
}

function getLocalAccessCode() {
  return (
    localStorage.getItem("br_crm_access_code") ||
    ""
  );
}

export default function Messages() {
  const theme = useTheme();
  const [searchParams, setSearchParams] =
    useSearchParams();

  const deepLinkHandledRef = useRef("");

  const mobileLayout = useMediaQuery(
    theme.breakpoints.down("md")
  );

  const [messages, setMessages] = useState([]);
  const [selectedPhone, setSelectedPhone] =
    useState("");
  const [mobileThreadOpen, setMobileThreadOpen] =
    useState(false);

  const [searchValue, setSearchValue] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState("");

  const [messageDraft, setMessageDraft] =
    useState("");
  const [sending, setSending] =
    useState(false);
  const [sendError, setSendError] =
    useState("");

  const [quickReplyAnchor, setQuickReplyAnchor] =
    useState(null);

  const [customerDialogOpen, setCustomerDialogOpen] =
    useState(false);
  const [customerDialogInitialData, setCustomerDialogInitialData] =
    useState(null);

  const [profileDrawerOpen, setProfileDrawerOpen] =
    useState(false);
  const [profileCustomer, setProfileCustomer] =
    useState(null);

  const [snackbar, setSnackbar] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const threadScrollRef = useRef(null);
  const textareaRef = useRef(null);

  const loadMessages = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const { data, error: queryError } =
        await supabase
          .from("sms_messages")
          .select(
            `
              *,
              customers (
                *
              )
            `
          )
          .order("created_at", {
            ascending: true,
          });

      if (queryError) {
        console.error(
          "Could not load SMS messages:",
          queryError
        );

        setError(
          queryError.message ||
            "Messages could not be loaded."
        );
      } else {
        setMessages(data ?? []);
      }

      setLoading(false);
      setRefreshing(false);
    },
    []
  );

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    const channel = supabase
      .channel("crm-sms-messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sms_messages",
        },
        () => {
          loadMessages({
            silent: true,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadMessages]);

  const conversations = useMemo(() => {
    const conversationMap = new Map();

    messages.forEach((message) => {
      const phone = getConversationPhone(message);

      if (!phone) {
        return;
      }

      const key = normalizePhone(phone) || phone;

      const existing =
        conversationMap.get(key) ?? {
          key,
          phone,
          customer: null,
          messages: [],
          unreadCount: 0,
          latestMessage: null,
        };

      const customer = getCustomer(message);

      if (!existing.customer && customer) {
        existing.customer = customer;
      }

      existing.messages.push(message);

      if (
        message.direction === "inbound" &&
        !message.is_read
      ) {
        existing.unreadCount += 1;
      }

      existing.latestMessage = message;

      conversationMap.set(key, existing);
    });

    return Array.from(
      conversationMap.values()
    ).sort((first, second) => {
      const firstDate = new Date(
        first.latestMessage?.created_at ?? 0
      ).getTime();

      const secondDate = new Date(
        second.latestMessage?.created_at ?? 0
      ).getTime();

      return secondDate - firstDate;
    });
  }, [messages]);

  const filteredConversations = useMemo(() => {
    const search = searchValue
      .trim()
      .toLowerCase();

    if (!search) {
      return conversations;
    }

    return conversations.filter(
      (conversation) => {
        const customerName = getCustomerName(
          conversation.customer
        ).toLowerCase();

        const phone = formatPhone(
          conversation.phone
        ).toLowerCase();

        const rawPhone = String(
          conversation.phone ?? ""
        ).toLowerCase();

        const latestBody = String(
          conversation.latestMessage?.body ?? ""
        ).toLowerCase();

        return (
          customerName.includes(search) ||
          phone.includes(search) ||
          rawPhone.includes(search) ||
          latestBody.includes(search)
        );
      }
    );
  }, [conversations, searchValue]);

  const selectedConversation = useMemo(() => {
    if (!selectedPhone) {
      return null;
    }

    return (
      conversations.find(
        (conversation) =>
          conversation.key === selectedPhone
      ) ?? null
    );
  }, [conversations, selectedPhone]);

  useEffect(() => {
    if (
      !selectedPhone &&
      conversations.length > 0 &&
      !mobileLayout
    ) {
      setSelectedPhone(conversations[0].key);
    }
  }, [
    conversations,
    mobileLayout,
    selectedPhone,
  ]);

  useEffect(() => {
    if (
      selectedPhone &&
      conversations.length > 0 &&
      !conversations.some(
        (conversation) =>
          conversation.key === selectedPhone
      )
    ) {
      setSelectedPhone(
        mobileLayout
          ? ""
          : conversations[0]?.key ?? ""
      );

      setMobileThreadOpen(false);
    }
  }, [
    conversations,
    mobileLayout,
    selectedPhone,
  ]);

  const markConversationRead = useCallback(
    async (conversation) => {
      if (!conversation) {
        return;
      }

      const unreadIds =
        conversation.messages
          .filter(
            (message) =>
              message.direction === "inbound" &&
              !message.is_read
          )
          .map((message) => message.id);

      if (unreadIds.length === 0) {
        return;
      }

      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          unreadIds.includes(message.id)
            ? {
                ...message,
                is_read: true,
              }
            : message
        )
      );

      const { error: updateError } =
        await supabase
          .from("sms_messages")
          .update({
            is_read: true,
          })
          .in("id", unreadIds);

      if (updateError) {
        console.error(
          "Could not mark conversation read:",
          updateError
        );

        loadMessages({
          silent: true,
        });
      }
    },
    [loadMessages]
  );

  const openConversation = useCallback(
    (conversation) => {
      setSelectedPhone(conversation.key);
      setSendError("");

      if (mobileLayout) {
        setMobileThreadOpen(true);
      }

      markConversationRead(conversation);
    },
    [markConversationRead, mobileLayout]
  );

  useEffect(() => {
    if (conversations.length === 0) {
      return;
    }

    const customerId =
      searchParams.get("customer")?.trim() || "";

    const phoneFromUrl =
      searchParams.get("phone")?.trim() || "";

    if (!customerId && !phoneFromUrl) {
      return;
    }

    const deepLinkKey = customerId
      ? `customer:${customerId}`
      : `phone:${normalizePhone(phoneFromUrl)}`;

    if (
      deepLinkHandledRef.current ===
      deepLinkKey
    ) {
      return;
    }

    const matchingConversation =
      conversations.find((conversation) => {
        if (
          customerId &&
          String(
            conversation.customer?.id || ""
          ) === customerId
        ) {
          return true;
        }

        if (phoneFromUrl) {
          return (
            normalizePhone(
              conversation.phone
            ) ===
            normalizePhone(phoneFromUrl)
          );
        }

        return false;
      });

    if (!matchingConversation) {
      return;
    }

    deepLinkHandledRef.current =
      deepLinkKey;

    openConversation(
      matchingConversation
    );

    const nextSearchParams =
      new URLSearchParams(searchParams);

    nextSearchParams.delete("customer");
    nextSearchParams.delete("phone");

    setSearchParams(
      nextSearchParams,
      {
        replace: true,
      }
    );
  }, [
    conversations,
    openConversation,
    searchParams,
    setSearchParams,
  ]);

  useEffect(() => {
    if (selectedConversation) {
      markConversationRead(
        selectedConversation
      );
    }
  }, [
    markConversationRead,
    selectedConversation,
  ]);

  const closeMobileThread = () => {
    setMobileThreadOpen(false);
    setSendError("");
  };

  const totalUnread = useMemo(
    () =>
      conversations.reduce(
        (total, conversation) =>
          total + conversation.unreadCount,
        0
      ),
    [conversations]
  );

  const scrollToBottom = useCallback(
    ({ smooth = false } = {}) => {
      const container = threadScrollRef.current;

      if (!container) {
        return;
      }

      window.requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: smooth ? "smooth" : "auto",
        });
      });
    },
    []
  );

  useEffect(() => {
    if (!selectedConversation) {
      return;
    }

    scrollToBottom();
  }, [
    selectedConversation?.key,
    selectedConversation?.messages?.length,
    scrollToBottom,
  ]);

  const ensureAccessCode = () => {
    const existing = getLocalAccessCode();

    if (existing) {
      return existing;
    }

    const entered = window.prompt(
      "Enter the Backyard Relief CRM access code to send this message:"
    );

    if (!entered) {
      return "";
    }

    localStorage.setItem(
      "br_crm_access_code",
      entered
    );

    return entered;
  };

  const sendMessage = async () => {
    if (
      !selectedConversation ||
      sending
    ) {
      return;
    }

    const body = messageDraft.trim();

    if (!body) {
      return;
    }

    const toPhone = normalizePhoneForApi(
      selectedConversation.phone
    );

    if (!toPhone) {
      setSendError(
        "This conversation does not have a valid U.S. phone number."
      );
      return;
    }

    const accessCode = ensureAccessCode();

    if (!accessCode) {
      setSendError(
        "The CRM access code is required to send messages."
      );
      return;
    }

    setSending(true);
    setSendError("");

    const optimisticId =
      `optimistic-${Date.now()}`;

    const optimisticMessage = {
      id: optimisticId,
      customer_id:
        selectedConversation.customer?.id ?? null,
      direction: "outbound",
      from_phone: "+17206059964",
      to_phone: toPhone,
      body,
      status: "sending",
      media_count: 0,
      media_urls: [],
      is_read: true,
      created_at: new Date().toISOString(),
      customers:
        selectedConversation.customer ?? null,
      optimistic: true,
    };

    setMessages((currentMessages) => [
      ...currentMessages,
      optimisticMessage,
    ]);

    setMessageDraft("");
    scrollToBottom({
      smooth: true,
    });

    try {
      const response = await fetch(
        CRM_MESSAGE_ENDPOINT,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-crm-access-code": accessCode,
          },
          body: JSON.stringify({
            to_phone: toPhone,
            body,
            customer_id:
              selectedConversation.customer?.id ??
              null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data?.success) {
        if (response.status === 401) {
          localStorage.removeItem(
            "br_crm_access_code"
          );
        }

        throw new Error(
          data?.details ||
            data?.error ||
            "Message could not be sent."
        );
      }

      if (data.message) {
        setMessages((currentMessages) =>
          currentMessages.map((message) =>
            message.id === optimisticId
              ? {
                  ...data.message,
                  customers:
                    selectedConversation.customer ??
                    null,
                }
              : message
          )
        );
      } else {
        await loadMessages({
          silent: true,
        });
      }

      setSnackbar({
        open: true,
        severity: "success",
        message: "Message sent.",
      });

      scrollToBottom({
        smooth: true,
      });
    } catch (sendFailure) {
      console.error(
        "Could not send CRM message:",
        sendFailure
      );

      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === optimisticId
            ? {
                ...message,
                status: "failed",
                error_message:
                  sendFailure?.message ||
                  "Message failed to send.",
              }
            : message
        )
      );

      setSendError(
        sendFailure?.message ||
          "Message failed to send."
      );
    } finally {
      setSending(false);
    }
  };

  const handleComposerKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  };

  const chooseQuickReply = (reply) => {
    setMessageDraft(reply);
    setQuickReplyAnchor(null);

    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const createCustomerPrefill = () => ({
    phone: selectedConversation?.phone || "",
    first_name: "",
    last_name: "",
    email: "",
    service_plan: "Relief Plus",
    address: "",
    city: "",
    state: "",
    zip: "",
    service_day: "",
    service_days: [],
    dog_names: "",
    gate_code: "",
    access_instructions: "",
    notes: "Created from CRM Messages inbox.",
    deodorizer_enabled: true,
    deodorizer_frequency: "monthly",
  });

  const openCreateCustomer = () => {
    setCustomerDialogInitialData(
      createCustomerPrefill()
    );
    setCustomerDialogOpen(true);
  };

  const openEditCustomer = () => {
    if (!selectedConversation?.customer) {
      return;
    }

    setCustomerDialogInitialData(
      selectedConversation.customer
    );
    setCustomerDialogOpen(true);
  };

  const openCustomerProfile = () => {
    if (!selectedConversation?.customer) {
      return;
    }

    setProfileCustomer(
      selectedConversation.customer
    );
    setProfileDrawerOpen(true);
  };

  const saveCustomer = async (form) => {
    const existingCustomer =
      customerDialogInitialData?.id
        ? customerDialogInitialData
        : null;

    const serviceDays =
      Array.isArray(form.service_days) &&
      form.service_days.length > 0
        ? [...new Set(form.service_days)].filter(Boolean)
        : form.service_day
          ? [form.service_day]
          : [];

    const payload = {
      ...form,
      first_name:
        (form.first_name || "").trim(),
      last_name:
        (form.last_name || "").trim(),
      phone:
        (form.phone || "").trim(),
      email:
        (form.email || "").trim(),
      address:
        (form.address || "").trim(),
      city:
        (form.city || "").trim(),
      state:
        (form.state || "").trim(),
      zip:
        (form.zip || "").trim(),
      service_plan:
        form.service_plan || "Relief Plus",
      service_day:
        form.service_day ||
        serviceDays[0] ||
        null,
      service_days: serviceDays,
      status:
        form.status ||
        existingCustomer?.status ||
        "active",
    };

    let savedCustomer;

    if (existingCustomer) {
      const { data, error: updateError } =
        await supabase
          .from("customers")
          .update(payload)
          .eq("id", existingCustomer.id)
          .select()
          .single();

      if (updateError) {
        throw updateError;
      }

      savedCustomer = data;
    } else {
      const { data, error: insertError } =
        await supabase
          .from("customers")
          .insert([payload])
          .select()
          .single();

      if (insertError) {
        throw insertError;
      }

      savedCustomer = data;
    }

    const phone = normalizePhoneForApi(
      savedCustomer.phone
    );

    if (phone) {
      await supabase
        .from("sms_messages")
        .update({
          customer_id: savedCustomer.id,
        })
        .or(
          `from_phone.eq.${phone},to_phone.eq.${phone}`
        );
    }

    setCustomerDialogOpen(false);
    setCustomerDialogInitialData(null);
    setProfileCustomer(savedCustomer);

    await loadMessages({
      silent: true,
    });

    setSnackbar({
      open: true,
      severity: "success",
      message: existingCustomer
        ? "Customer updated."
        : "Customer created and linked to this conversation.",
    });
  };

  const retryMessage = (message) => {
    if (
      message?.status !== "failed" ||
      !message.body
    ) {
      return;
    }

    setMessageDraft(message.body);

    setMessages((currentMessages) =>
      currentMessages.filter(
        (currentMessage) =>
          currentMessage.id !== message.id
      )
    );

    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const conversationList = (
    <Paper
      elevation={0}
      sx={{
        display:
          mobileLayout && mobileThreadOpen
            ? "none"
            : "flex",
        flexDirection: "column",
        width: {
          xs: "100%",
          md: 380,
          lg: 430,
        },
        minWidth: 0,
        height: "100%",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: {
          xs: 2,
          md: 3,
        },
        overflow: "hidden",
        backgroundColor: "white",
      }}
    >
      <Box
        sx={{
          p: {
            xs: 2,
            sm: 2.5,
          },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
        >
          <Box minWidth={0}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
            >
              <Typography
                variant="h5"
                fontWeight={800}
                color="#173b20"
              >
                Messages
              </Typography>

              {totalUnread > 0 && (
                <Chip
                  size="small"
                  label={`${totalUnread} unread`}
                  sx={{
                    backgroundColor: "#C62828",
                    color: "white",
                    fontWeight: 700,
                  }}
                />
              )}
            </Stack>

            <Typography
              variant="body2"
              color="text.secondary"
              mt={0.5}
            >
              Customer texts sent to your
              Backyard Relief number
            </Typography>
          </Box>

          <IconButton
            aria-label="Refresh messages"
            onClick={() =>
              loadMessages({
                silent: true,
              })
            }
            disabled={refreshing}
            sx={{
              width: 44,
              height: 44,
            }}
          >
            {refreshing ? (
              <CircularProgress size={22} />
            ) : (
              <RefreshIcon />
            )}
          </IconButton>
        </Stack>

        <TextField
          fullWidth
          size="small"
          value={searchValue}
          onChange={(event) =>
            setSearchValue(event.target.value)
          }
          placeholder="Search customers or messages"
          sx={{
            mt: 2,
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon
                  fontSize="small"
                  color="action"
                />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Divider />

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {filteredConversations.length ===
        0 ? (
          <Stack
            alignItems="center"
            justifyContent="center"
            textAlign="center"
            spacing={1.5}
            sx={{
              minHeight: 300,
              px: 3,
            }}
          >
            <ChatBubbleOutlineIcon
              sx={{
                fontSize: 48,
                color: "text.disabled",
              }}
            />

            <Typography
              variant="h6"
              fontWeight={700}
            >
              {conversations.length === 0
                ? "No messages yet"
                : "No matching conversations"}
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
            >
              {conversations.length === 0
                ? "New customer texts will appear here automatically."
                : "Try another customer name, number, or message."}
            </Typography>
          </Stack>
        ) : (
          <List disablePadding>
            {filteredConversations.map(
              (conversation) => {
                const customerName =
                  getCustomerName(
                    conversation.customer
                  );

                const displayName =
                  customerName ||
                  formatPhone(
                    conversation.phone
                  );

                const latestBody =
                  conversation.latestMessage
                    ?.body ||
                  (conversation.latestMessage
                    ?.media_count > 0
                    ? "Media attachment"
                    : "No message text");

                const selected =
                  conversation.key ===
                  selectedPhone;

                return (
                  <Box
                    key={conversation.key}
                  >
                    <ListItemButton
                      selected={selected}
                      onClick={() =>
                        openConversation(
                          conversation
                        )
                      }
                      sx={{
                        alignItems: "flex-start",
                        minHeight: 76,
                        px: 2,
                        py: 1.75,

                        "&.Mui-selected": {
                          backgroundColor:
                            LIGHT_GREEN,
                          borderLeft: `4px solid ${BRAND_GREEN}`,
                          pl: 1.5,
                        },

                        "&.Mui-selected:hover": {
                          backgroundColor:
                            "#dff1e1",
                        },
                      }}
                    >
                      <ListItemAvatar>
                        <Badge
                          color="error"
                          badgeContent={
                            conversation.unreadCount
                          }
                          invisible={
                            conversation.unreadCount ===
                            0
                          }
                        >
                          <Avatar
                            sx={{
                              backgroundColor:
                                selected
                                  ? BRAND_GREEN
                                  : "#e8ece9",
                              color: selected
                                ? "white"
                                : BRAND_GREEN,
                              fontWeight: 800,
                            }}
                          >
                            {getInitials(
                              customerName,
                              conversation.phone
                            )}
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>

                      <ListItemText
                        primary={
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            spacing={1}
                          >
                            <Typography
                              noWrap
                              fontWeight={
                                conversation.unreadCount >
                                0
                                  ? 800
                                  : 650
                              }
                            >
                              {displayName}
                            </Typography>

                            <Typography
                              variant="caption"
                              color="text.secondary"
                              flexShrink={0}
                            >
                              {formatConversationDate(
                                conversation
                                  .latestMessage
                                  ?.created_at
                              )}
                            </Typography>
                          </Stack>
                        }
                        secondary={
                          <Box mt={0.35}>
                            {customerName && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                display="block"
                                noWrap
                              >
                                {formatPhone(
                                  conversation.phone
                                )}
                              </Typography>
                            )}

                            <Typography
                              variant="body2"
                              noWrap
                              color={
                                conversation.unreadCount >
                                0
                                  ? "text.primary"
                                  : "text.secondary"
                              }
                              fontWeight={
                                conversation.unreadCount >
                                0
                                  ? 700
                                  : 400
                              }
                            >
                              {latestBody}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItemButton>

                    <Divider component="li" />
                  </Box>
                );
              }
            )}
          </List>
        )}
      </Box>
    </Paper>
  );

  const conversationThread = (
    <Paper
      elevation={0}
      sx={{
        display:
          mobileLayout && !mobileThreadOpen
            ? "none"
            : "flex",
        flex: 1,
        minWidth: 0,
        height: "100%",
        flexDirection: "column",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: {
          xs: 2,
          md: 3,
        },
        overflow: "hidden",
        backgroundColor: "white",
      }}
    >
      {!selectedConversation ? (
        <Stack
          flex={1}
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          spacing={2}
          sx={{
            p: 4,
          }}
        >
          <Avatar
            sx={{
              width: 72,
              height: 72,
              backgroundColor: LIGHT_GREEN,
              color: BRAND_GREEN,
            }}
          >
            <ChatBubbleOutlineIcon
              sx={{
                fontSize: 36,
              }}
            />
          </Avatar>

          <Box>
            <Typography
              variant="h5"
              fontWeight={800}
            >
              Select a conversation
            </Typography>

            <Typography
              color="text.secondary"
              mt={1}
            >
              Choose a customer or phone
              number to view the complete
              message history.
            </Typography>
          </Box>
        </Stack>
      ) : (
        <>
          <Box
            sx={{
              position: "sticky",
              top: 0,
              zIndex: 4,
              px: {
                xs: 1,
                sm: 2,
              },
              pt: {
                xs: "max(10px, env(safe-area-inset-top))",
                md: 1.25,
              },
              pb: 1.25,
              borderBottom: "1px solid",
              borderColor: "divider",
              backgroundColor: "white",
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
            >
              {mobileLayout && (
                <IconButton
                  aria-label="Back to conversations"
                  onClick={closeMobileThread}
                  sx={{
                    width: 44,
                    height: 44,
                  }}
                >
                  <ArrowBackIcon />
                </IconButton>
              )}

              <Avatar
                sx={{
                  backgroundColor: BRAND_GREEN,
                  fontWeight: 800,
                }}
              >
                {getInitials(
                  getCustomerName(
                    selectedConversation.customer
                  ),
                  selectedConversation.phone
                )}
              </Avatar>

              <Box
                flex={1}
                minWidth={0}
              >
                <Typography
                  variant="h6"
                  fontWeight={800}
                  noWrap
                >
                  {getCustomerName(
                    selectedConversation.customer
                  ) ||
                    formatPhone(
                      selectedConversation.phone
                    )}
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  noWrap
                >
                  {selectedConversation.customer
                    ? [
                        selectedConversation
                          .customer.service_plan,
                        formatServiceDays(
                          selectedConversation.customer
                        ),
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : "Unknown contact · New lead"}
                </Typography>
              </Box>

              <Tooltip title="Call">
                <IconButton
                  component="a"
                  href={`tel:${selectedConversation.phone}`}
                  aria-label="Call"
                  sx={{
                    width: 44,
                    height: 44,
                  }}
                >
                  <CallIcon />
                </IconButton>
              </Tooltip>

              {selectedConversation.customer ? (
                <>
                  <Tooltip title="View profile">
                    <IconButton
                      onClick={openCustomerProfile}
                      aria-label="View customer profile"
                      sx={{
                        width: 44,
                        height: 44,
                      }}
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Edit customer">
  <IconButton
    onClick={openEditCustomer}
    aria-label="Edit customer"
    sx={{
      width: 44,
      height: 44,
      flexShrink: 0,
    }}
  >
    <EditIcon />
  </IconButton>
</Tooltip>
                </>
              ) : (
                <Tooltip title="Create customer">
                  <IconButton
                    onClick={openCreateCustomer}
                    aria-label="Create customer"
                    sx={{
                      width: 44,
                      height: 44,
                      color: BRAND_GREEN,
                    }}
                  >
                    <PersonAddAltIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>

            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              flexWrap="wrap"
              sx={{
                mt: 1,
                pl: {
                  xs: mobileLayout ? 5.5 : 0,
                  sm: 0,
                },
              }}
            >
              {selectedConversation.customer ? (
                <>
                  <Chip
                    size="small"
                    label={formatStatus(
                      selectedConversation.customer
                        .status
                    )}
                    color={getStatusChipColor(
                      selectedConversation.customer
                        .status
                    )}
                  />

                  {selectedConversation.customer
                    .service_plan && (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={
                        selectedConversation.customer
                          .service_plan
                      }
                    />
                  )}

                  {formatServiceDays(
                    selectedConversation.customer
                  ) && (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={formatServiceDays(
                        selectedConversation.customer
                      )}
                    />
                  )}
                </>
              ) : (
                <Chip
                  size="small"
                  label="New Lead"
                  sx={{
                    backgroundColor: "#FFF3E0",
                    color: "#9A4D00",
                    fontWeight: 700,
                  }}
                />
              )}
            </Stack>

            {selectedConversation.customer?.address && (
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                noWrap
                sx={{
                  mt: 0.75,
                  pl: {
                    xs: mobileLayout ? 5.5 : 0,
                    sm: 0,
                  },
                }}
              >
                {[
                  selectedConversation.customer
                    .address,
                  selectedConversation.customer
                    .city,
                  selectedConversation.customer
                    .state,
                  selectedConversation.customer.zip,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </Typography>
            )}
          </Box>

          <Box
            ref={threadScrollRef}
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              p: {
                xs: 1.5,
                sm: 3,
              },
              backgroundColor:
                PAGE_BACKGROUND,
              overscrollBehavior: "contain",
            }}
          >
            <Stack spacing={1.5}>
              {selectedConversation.messages.map(
                (message) => {
                  const outbound =
                    message.direction ===
                    "outbound";

                  const mediaItems =
                    getMediaItems(message);

                  const failed =
                    message.status === "failed";

                  return (
                    <Box
                      key={message.id}
                      sx={{
                        display: "flex",
                        justifyContent: outbound
                          ? "flex-end"
                          : "flex-start",
                      }}
                    >
                      <Box
                        sx={{
                          width: "fit-content",
                          maxWidth: {
                            xs: "90%",
                            sm: "78%",
                          },
                        }}
                      >
                        <Paper
                          elevation={0}
                          sx={{
                            px: 1.75,
                            py: 1.25,
                            borderRadius: outbound
                              ? "18px 18px 4px 18px"
                              : "18px 18px 18px 4px",

                            color: outbound
                              ? "white"
                              : "text.primary",

                            backgroundColor: failed
                              ? "#B71C1C"
                              : outbound
                                ? BRAND_GREEN
                                : "white",

                            border: outbound
                              ? "none"
                              : "1px solid",

                            borderColor:
                              "divider",
                            opacity:
                              message.status ===
                              "sending"
                                ? 0.72
                                : 1,
                          }}
                        >
                          {message.body && (
                            <Typography
                              variant="body1"
                              sx={{
                                whiteSpace:
                                  "pre-wrap",
                                overflowWrap:
                                  "anywhere",
                              }}
                            >
                              {message.body}
                            </Typography>
                          )}

                          {mediaItems.length >
                            0 && (
                            <Stack
                              spacing={1}
                              mt={
                                message.body
                                  ? 1.25
                                  : 0
                              }
                            >
                              {mediaItems.map(
                                (
                                  mediaItem,
                                  index
                                ) => (
                                  <Button
                                    key={`${message.id}-${index}`}
                                    component="a"
                                    href={
                                      mediaItem.url
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    size="small"
                                    variant={
                                      outbound
                                        ? "outlined"
                                        : "contained"
                                    }
                                    startIcon={
                                      <AttachFileIcon />
                                    }
                                    sx={{
                                      justifyContent:
                                        "flex-start",

                                      color: outbound
                                        ? "white"
                                        : BRAND_GREEN,

                                      borderColor:
                                        outbound
                                          ? "rgba(255,255,255,0.7)"
                                          : undefined,

                                      backgroundColor:
                                        outbound
                                          ? "transparent"
                                          : LIGHT_GREEN,
                                    }}
                                  >
                                    Open attachment
                                  </Button>
                                )
                              )}
                            </Stack>
                          )}
                        </Paper>

                        <Stack
                          direction="row"
                          spacing={0.75}
                          alignItems="center"
                          justifyContent={
                            outbound
                              ? "flex-end"
                              : "flex-start"
                          }
                          mt={0.45}
                          px={0.5}
                        >
                          {failed && (
                            <ErrorOutlineIcon
                              color="error"
                              sx={{
                                fontSize: 15,
                              }}
                            />
                          )}

                          <Typography
                            variant="caption"
                            color={
                              failed
                                ? "error.main"
                                : "text.secondary"
                            }
                          >
                            {outbound
                              ? message.status ===
                                "sending"
                                ? "Sending… · "
                                : failed
                                  ? "Failed · "
                                  : `${formatStatus(
                                      message.status ||
                                        "sent"
                                    )} · `
                              : ""}

                            {formatMessageTime(
                              message.created_at
                            )}
                          </Typography>

                          {failed && (
                            <Button
                              size="small"
                              onClick={() =>
                                retryMessage(message)
                              }
                              sx={{
                                minWidth: 0,
                                px: 0.75,
                                fontSize: 11,
                              }}
                            >
                              Retry
                            </Button>
                          )}
                        </Stack>
                      </Box>
                    </Box>
                  );
                }
              )}
            </Stack>
          </Box>

          <Box
            sx={{
              position: "sticky",
              bottom: 0,
              zIndex: 5,
              p: {
                xs: 1,
                sm: 1.5,
              },
              pb: {
                xs: "max(10px, env(safe-area-inset-bottom))",
                sm: 1.5,
              },
              borderTop: "1px solid",
              borderColor: "divider",
              backgroundColor: "white",
            }}
          >
            {sendError && (
              <Alert
                severity="error"
                onClose={() =>
                  setSendError("")
                }
                sx={{
                  mb: 1,
                  borderRadius: 2,
                }}
              >
                {sendError}
              </Alert>
            )}

            <Stack
              direction="row"
              spacing={1}
              alignItems="flex-end"
            >
              <Tooltip title="MMS attachments coming soon">
                <span>
                  <IconButton
                    disabled
                    aria-label="Attach file"
                    sx={{
                      width: 44,
                      height: 44,
                    }}
                  >
                    <AttachFileIcon />
                  </IconButton>
                </span>
              </Tooltip>

              <TextField
                fullWidth
                multiline
                minRows={1}
                maxRows={5}
                inputRef={textareaRef}
                value={messageDraft}
                onChange={(event) =>
                  setMessageDraft(
                    event.target.value.slice(
                      0,
                      1600
                    )
                  )
                }
                onKeyDown={
                  handleComposerKeyDown
                }
                placeholder="Type a message…"
                disabled={sending}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    alignItems: "flex-end",
                  },
                }}
              />

              <IconButton
                aria-label="Quick replies"
                onClick={(event) =>
                  setQuickReplyAnchor(
                    event.currentTarget
                  )
                }
                sx={{
                  width: 44,
                  height: 44,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <ExpandMoreIcon />
              </IconButton>

              <IconButton
                aria-label="Send message"
                onClick={sendMessage}
                disabled={
                  sending ||
                  !messageDraft.trim()
                }
                sx={{
                  width: 48,
                  height: 48,
                  color: "white",
                  backgroundColor:
                    BRAND_GREEN,
                  "&:hover": {
                    backgroundColor:
                      "#164d1a",
                  },
                  "&.Mui-disabled": {
                    backgroundColor:
                      "#d8ded9",
                    color: "#8a948b",
                  },
                }}
              >
                {sending ? (
                  <CircularProgress
                    size={21}
                    sx={{
                      color: "white",
                    }}
                  />
                ) : (
                  <SendIcon />
                )}
              </IconButton>
            </Stack>

            <Stack
              direction="row"
              justifyContent="space-between"
              spacing={1}
              mt={0.5}
              px={0.5}
            >
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Enter to send · Shift+Enter for
                a new line
              </Typography>

              <Typography
                variant="caption"
                color={
                  messageDraft.length > 1500
                    ? "warning.main"
                    : "text.secondary"
                }
              >
                {messageDraft.length}/1600
              </Typography>
            </Stack>
          </Box>
        </>
      )}
    </Paper>
  );

  return (
    <>
      <Box
        sx={{
          width: "100%",
          height: {
            xs: "calc(100dvh - 110px)",
            md: "calc(100dvh - 60px)",
          },
          minHeight: {
            xs: 520,
            md: 620,
          },
        }}
      >
        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 2,
              borderRadius: 2,
            }}
          >
            {error}
          </Alert>
        )}

        {loading ? (
          <Stack
            alignItems="center"
            justifyContent="center"
            spacing={2}
            sx={{
              height: "100%",
            }}
          >
            <CircularProgress
              sx={{
                color: BRAND_GREEN,
              }}
            />

            <Typography color="text.secondary">
              Loading your messages…
            </Typography>
          </Stack>
        ) : (
          <Stack
            direction={{
              xs: "column",
              md: "row",
            }}
            spacing={2}
            sx={{
              height: "100%",
              minWidth: 0,
            }}
          >
            {conversationList}
            {conversationThread}
          </Stack>
        )}
      </Box>

      <Menu
        anchorEl={quickReplyAnchor}
        open={Boolean(quickReplyAnchor)}
        onClose={() =>
          setQuickReplyAnchor(null)
        }
        PaperProps={{
          sx: {
            width: {
              xs: "calc(100vw - 32px)",
              sm: 420,
            },
            maxWidth: "calc(100vw - 32px)",
            maxHeight: 360,
          },
        }}
      >
        {QUICK_REPLIES.map((reply) => (
          <MenuItem
            key={reply}
            onClick={() =>
              chooseQuickReply(reply)
            }
            sx={{
              whiteSpace: "normal",
              py: 1.25,
            }}
          >
            {reply}
          </MenuItem>
        ))}
      </Menu>

      <CustomerDialog
        open={customerDialogOpen}
        onClose={() => {
          setCustomerDialogOpen(false);
          setCustomerDialogInitialData(null);
        }}
        onSave={saveCustomer}
        initialData={
          customerDialogInitialData
        }
      />

      <CustomerProfileDrawer
        open={profileDrawerOpen}
        onClose={() =>
          setProfileDrawerOpen(false)
        }
        customer={profileCustomer}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={() =>
          setSnackbar((current) => ({
            ...current,
            open: false,
          }))
        }
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() =>
            setSnackbar((current) => ({
              ...current,
              open: false,
            }))
          }
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
