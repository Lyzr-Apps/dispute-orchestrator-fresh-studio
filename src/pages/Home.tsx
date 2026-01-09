import { useState, useRef, useEffect } from 'react'
import { callAIAgent } from '@/utils/aiAgent'
import type { NormalizedAgentResponse } from '@/utils/aiAgent'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  MessageCircle,
  Send,
  ChevronDown,
  ChevronUp,
  Download,
  Copy,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  User,
  Bot,
  Calendar,
  DollarSign,
  FileText,
  Shield,
  TrendingUp,
  Clock,
  Phone,
  Mail
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'

// Agent IDs
const CUSTOMER_CONVERSATION_AGENT_ID = "696147c7c57d451439d4cd48"
const SQL_QUERY_AGENT_ID = "696147dfd09b552363344543"
const SOP_COMPLIANCE_AGENT_ID = "696147f4d09b552363344544"
const DECISION_SYNTHESIS_AGENT_ID = "6961480bd09b552363344546"
const CUSTOMER_RESOLUTION_AGENT_ID = "69614825d09b55236334454c"
const DISPUTE_ORCHESTRATOR_AGENT_ID = "69614847d09b55236334454d"

// TypeScript interfaces from ACTUAL response schemas

// Customer Conversation Agent Response
interface TransactionDetails {
  date: string
  amount: number
  merchant: string
  description: string
}

interface CustomerConversationResult {
  case_summary: string
  transaction_details: TransactionDetails
  dispute_reason: string
  supporting_context: string
  customer_sentiment: string
  next_steps: string
}

// SQL Query Agent Response
interface DisputedTransaction {
  transaction_id: string
  date: string
  amount: number
  merchant: string
  category: string
  status: string
}

interface AccountHistory {
  account_age_days: number
  total_transactions: number
  average_monthly_spend: number
  previous_disputes: number
}

interface SQLQueryResult {
  disputed_transaction: DisputedTransaction
  related_transactions: any[]
  account_history: AccountHistory
  queries_executed: any[]
  data_summary: string
}

// SOP Compliance Agent Response
interface ApplicablePolicy {
  policy_id: string
  policy_name: string
  description: string
  applies_because: string
}

interface ComplianceRule {
  rule_id: string
  rule_description: string
  threshold: string
  current_case_status: string
}

interface ApprovalCriteria {
  auto_approve_conditions: string[]
  auto_deny_conditions: string[]
  manual_review_conditions: string[]
}

interface SOPComplianceResult {
  applicable_policies: ApplicablePolicy[]
  compliance_rules: ComplianceRule[]
  approval_criteria: ApprovalCriteria
  policy_citations: string[]
  recommendation: string
  confidence: number
}

// Decision Synthesis Agent Response
interface KeyFinding {
  finding: string
  impact: string
  weight: string
}

interface PolicyCitation {
  policy_id: string
  policy_name: string
  relevance: string
}

interface DecisionSynthesisResult {
  final_decision: string
  decision_confidence: number
  reasoning: string
  key_findings: KeyFinding[]
  policy_citations: PolicyCitation[]
  supporting_evidence: any[]
  risk_factors: string[]
  recommended_action: string
  escalation_reason: string
}

// Customer Resolution Agent Response
interface PolicyReference {
  policy_name: string
  customer_friendly_explanation: string
}

interface NextStep {
  step_number: number
  action: string
  timeline: string
}

interface AppealOptions {
  can_appeal: boolean
  appeal_deadline: string
  appeal_instructions: string
}

interface ContactInfo {
  support_phone: string
  support_email: string
  hours: string
}

interface CustomerResolutionResult {
  decision_summary: string
  detailed_explanation: string
  decision_type: string
  resolution_amount: number | null
  policy_references: PolicyReference[]
  next_steps: NextStep[]
  appeal_options: AppealOptions
  contact_info: ContactInfo
  estimated_resolution_date: string | null
}

// Dispute Orchestrator Response
interface SubAgentResult {
  agent_name: string
  status: string
  output: any
}

interface DisputeOrchestratorResult {
  final_output: any
  sub_agent_results: SubAgentResult[]
  summary: string
  workflow_completed: boolean
}

// Chat message interface
interface ChatMessage {
  role: 'user' | 'agent'
  content: string
  timestamp: Date
}

// Phase enum
type Phase = 'conversation' | 'summary' | 'analysis' | 'resolution'

// Main component
export default function Home() {
  // Phase management
  const [currentPhase, setCurrentPhase] = useState<Phase>('conversation')

  // Phase 1: Conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'agent',
      content: "Hello! I'm here to help you with your credit card dispute. Could you please tell me about the transaction you'd like to dispute?",
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [conversationLoading, setConversationLoading] = useState(false)
  const [conversationResult, setConversationResult] = useState<CustomerConversationResult | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Phase 2: Summary state
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedSummary, setEditedSummary] = useState('')

  // Phase 3: Analysis state
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisStep, setAnalysisStep] = useState('Initializing...')
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [sqlResult, setSqlResult] = useState<SQLQueryResult | null>(null)
  const [sopResult, setSopResult] = useState<SOPComplianceResult | null>(null)
  const [decisionResult, setDecisionResult] = useState<DecisionSynthesisResult | null>(null)

  // Phase 4: Resolution state
  const [resolutionResult, setResolutionResult] = useState<CustomerResolutionResult | null>(null)
  const [resolutionMessages, setResolutionMessages] = useState<ChatMessage[]>([])
  const [resolutionInput, setResolutionInput] = useState('')
  const [resolutionLoading, setResolutionLoading] = useState(false)

  // Collapsible states
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    transaction: true,
    policies: false,
    findings: false,
    evidence: false,
    appeal: false
  })

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, resolutionMessages])

  // Phase 1: Send message to Customer Conversation Agent
  const sendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setConversationLoading(true)

    try {
      const result = await callAIAgent(inputMessage, CUSTOMER_CONVERSATION_AGENT_ID)

      if (result.success && result.response) {
        const agentResponse = result.response as NormalizedAgentResponse

        // Add agent response to chat
        const agentMessage: ChatMessage = {
          role: 'agent',
          content: agentResponse.message || 'Thank you for that information. Is there anything else you'd like to add about this dispute?',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, agentMessage])

        // If we have a complete case summary, store it
        if (agentResponse.result?.case_summary) {
          setConversationResult(agentResponse.result as CustomerConversationResult)
        }
      } else {
        const errorMessage: ChatMessage = {
          role: 'agent',
          content: 'I apologize, but I encountered an error. Could you please try again?',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'agent',
        content: 'I apologize, but I encountered an error. Could you please try again?',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setConversationLoading(false)
    }
  }

  // Phase 2: Submit for analysis
  const submitForAnalysis = async () => {
    if (!conversationResult) return

    setCurrentPhase('analysis')
    setAnalysisLoading(true)
    setAnalysisProgress(0)
    setAnalysisStep('Retrieving transaction records...')

    // Simulate progressive analysis
    setTimeout(() => setAnalysisProgress(25), 500)
    setTimeout(() => {
      setAnalysisProgress(50)
      setAnalysisStep('Checking policy compliance...')
    }, 1500)
    setTimeout(() => {
      setAnalysisProgress(75)
      setAnalysisStep('Analyzing decision factors...')
    }, 3000)

    try {
      // Call the Dispute Orchestrator (which coordinates sub-agents)
      const caseData = JSON.stringify({
        case_summary: conversationResult.case_summary,
        transaction_details: conversationResult.transaction_details,
        dispute_reason: conversationResult.dispute_reason,
        supporting_context: conversationResult.supporting_context
      })

      const result = await callAIAgent(caseData, DISPUTE_ORCHESTRATOR_AGENT_ID)

      if (result.success && result.response) {
        const orchestratorResponse = result.response as NormalizedAgentResponse
        const orchestratorResult = orchestratorResponse.result as DisputeOrchestratorResult

        // Extract sub-agent results
        if (orchestratorResult.sub_agent_results) {
          orchestratorResult.sub_agent_results.forEach(subResult => {
            if (subResult.agent_name.includes('SQL')) {
              setSqlResult(subResult.output as SQLQueryResult)
            } else if (subResult.agent_name.includes('SOP') || subResult.agent_name.includes('Compliance')) {
              setSopResult(subResult.output as SOPComplianceResult)
            } else if (subResult.agent_name.includes('Decision') || subResult.agent_name.includes('Synthesis')) {
              setDecisionResult(subResult.output as DecisionSynthesisResult)
            }
          })
        }

        // If final_output contains decision data, use it
        if (orchestratorResult.final_output) {
          setDecisionResult(orchestratorResult.final_output as DecisionSynthesisResult)
        }

        setAnalysisProgress(100)
        setAnalysisStep('Analysis complete!')

        // After a short delay, move to resolution phase
        setTimeout(() => {
          generateResolution()
        }, 1000)
      }
    } catch (error) {
      setAnalysisStep('Analysis failed. Please try again.')
    } finally {
      setAnalysisLoading(false)
    }
  }

  // Generate customer-friendly resolution
  const generateResolution = async () => {
    if (!decisionResult) return

    try {
      const decisionData = JSON.stringify({
        decision: decisionResult.final_decision,
        reasoning: decisionResult.reasoning,
        policy_citations: decisionResult.policy_citations
      })

      const result = await callAIAgent(decisionData, CUSTOMER_RESOLUTION_AGENT_ID)

      if (result.success && result.response) {
        const resolutionResponse = result.response as NormalizedAgentResponse
        setResolutionResult(resolutionResponse.result as CustomerResolutionResult)
        setCurrentPhase('resolution')
      }
    } catch (error) {
      console.error('Failed to generate resolution:', error)
    }
  }

  // Phase 4: Send question to Customer Resolution Agent
  const sendResolutionQuestion = async () => {
    if (!resolutionInput.trim()) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: resolutionInput,
      timestamp: new Date()
    }

    setResolutionMessages(prev => [...prev, userMessage])
    setResolutionInput('')
    setResolutionLoading(true)

    try {
      const result = await callAIAgent(resolutionInput, CUSTOMER_RESOLUTION_AGENT_ID)

      if (result.success && result.response) {
        const agentResponse = result.response as NormalizedAgentResponse

        const agentMessage: ChatMessage = {
          role: 'agent',
          content: agentResponse.message || 'I\'m here to help answer any questions about your dispute decision.',
          timestamp: new Date()
        }
        setResolutionMessages(prev => [...prev, agentMessage])
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'agent',
        content: 'I apologize, but I encountered an error. Could you please try again?',
        timestamp: new Date()
      }
      setResolutionMessages(prev => [...prev, errorMessage])
    } finally {
      setResolutionLoading(false)
    }
  }

  // Toggle collapsible section
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  // Download summary
  const downloadSummary = () => {
    if (!conversationResult || !resolutionResult) return

    const content = `
CREDIT CARD DISPUTE SUMMARY
===========================

Case Summary: ${conversationResult.case_summary}

Transaction Details:
- Date: ${conversationResult.transaction_details.date}
- Amount: $${conversationResult.transaction_details.amount}
- Merchant: ${conversationResult.transaction_details.merchant}
- Description: ${conversationResult.transaction_details.description}

Dispute Reason: ${conversationResult.dispute_reason}

Decision: ${resolutionResult.decision_type.toUpperCase()}
${resolutionResult.decision_summary}

${resolutionResult.detailed_explanation}

Next Steps:
${resolutionResult.next_steps.map(step => `${step.step_number}. ${step.action} (${step.timeline})`).join('\n')}

Contact Information:
Phone: ${resolutionResult.contact_info.support_phone}
Email: ${resolutionResult.contact_info.support_email}
Hours: ${resolutionResult.contact_info.hours}
    `.trim()

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dispute-summary.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Render decision badge color
  const getDecisionColor = (decision: string) => {
    const d = decision.toLowerCase()
    if (d.includes('approve') || d.includes('approved')) return 'bg-green-500'
    if (d.includes('deny') || d.includes('denied')) return 'bg-red-500'
    if (d.includes('escalate') || d.includes('review')) return 'bg-yellow-500'
    return 'bg-blue-500'
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1a365d] text-white py-4 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-[#319795]" />
            <div>
              <h1 className="text-2xl font-bold">Credit Card Dispute Management</h1>
              <p className="text-sm text-gray-300">Secure & Compliant Resolution System</p>
            </div>
          </div>

          {/* Phase indicator */}
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${currentPhase === 'conversation' ? 'bg-[#319795]' : 'bg-gray-600'}`}>
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm font-medium">1. Conversation</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${currentPhase === 'summary' ? 'bg-[#319795]' : 'bg-gray-600'}`}>
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium">2. Summary</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${currentPhase === 'analysis' ? 'bg-[#319795]' : 'bg-gray-600'}`}>
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">3. Analysis</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${currentPhase === 'resolution' ? 'bg-[#319795]' : 'bg-gray-600'}`}>
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">4. Resolution</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto p-6">
        {/* Phase 1: Customer Portal (Conversation) */}
        {currentPhase === 'conversation' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat interface - 2/3 width */}
            <div className="lg:col-span-2">
              <Card className="h-[calc(100vh-200px)] flex flex-col">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-[#319795]" />
                    Dispute Conversation
                  </CardTitle>
                  <CardDescription>
                    Please provide details about the transaction you're disputing
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-full p-6">
                    <div className="space-y-4">
                      {messages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-[#1a365d]' : 'bg-[#319795]'}`}>
                            {msg.role === 'user' ? (
                              <User className="w-4 h-4 text-white" />
                            ) : (
                              <Bot className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <div className={`flex-1 max-w-[80%] ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                            <div className={`inline-block p-3 rounded-lg ${msg.role === 'user' ? 'bg-[#1a365d] text-white' : 'bg-white border border-gray-200'}`}>
                              <p className="text-sm">{msg.content}</p>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {msg.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                </CardContent>

                <CardFooter className="border-t p-4">
                  <div className="flex gap-2 w-full">
                    <Textarea
                      placeholder="Type your message..."
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                      className="min-h-[60px] resize-none"
                      disabled={conversationLoading}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={conversationLoading || !inputMessage.trim()}
                      className="bg-[#319795] hover:bg-[#2c8785]"
                    >
                      {conversationLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </div>

            {/* Context panel - 1/3 width */}
            <div className="space-y-4">
              {conversationResult && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#319795]" />
                        Detected Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Transaction</p>
                        <p className="text-sm font-semibold">{conversationResult.transaction_details.merchant}</p>
                        <p className="text-sm text-gray-600">{formatCurrency(conversationResult.transaction_details.amount)}</p>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Date</p>
                        <p className="text-sm">{conversationResult.transaction_details.date}</p>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Dispute Reason</p>
                        <p className="text-sm">{conversationResult.dispute_reason}</p>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Customer Sentiment</p>
                        <Badge variant="outline" className="capitalize">
                          {conversationResult.customer_sentiment}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Button
                    onClick={() => setCurrentPhase('summary')}
                    className="w-full bg-[#319795] hover:bg-[#2c8785]"
                  >
                    Continue to Summary Review
                  </Button>
                </>
              )}

              {!conversationResult && (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-500 text-center">
                      Conversation information will appear here as you provide details about your dispute
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Phase 2: Case Summary Review */}
        {currentPhase === 'summary' && conversationResult && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Review Your Dispute Summary</h2>
              <Button
                variant="outline"
                onClick={() => setCurrentPhase('conversation')}
              >
                Back to Conversation
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Summary card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#319795]" />
                    Case Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isEditMode ? (
                    <>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Summary</p>
                        <p className="text-sm mt-1">{conversationResult.case_summary}</p>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Dispute Reason</p>
                        <p className="text-sm mt-1">{conversationResult.dispute_reason}</p>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Supporting Context</p>
                        <p className="text-sm mt-1">{conversationResult.supporting_context}</p>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setIsEditMode(true)
                          setEditedSummary(conversationResult.case_summary)
                        }}
                      >
                        Edit Details
                      </Button>
                    </>
                  ) : (
                    <>
                      <Textarea
                        value={editedSummary}
                        onChange={(e) => setEditedSummary(e.target.value)}
                        className="min-h-[200px]"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setConversationResult({
                              ...conversationResult,
                              case_summary: editedSummary
                            })
                            setIsEditMode(false)
                          }}
                          className="flex-1 bg-[#319795] hover:bg-[#2c8785]"
                        >
                          Save Changes
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setIsEditMode(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Transaction preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-[#319795]" />
                    Transaction Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Merchant</p>
                      <p className="text-lg font-semibold">{conversationResult.transaction_details.merchant}</p>
                    </div>
                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                      Disputed
                    </Badge>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        Amount
                      </p>
                      <p className="text-xl font-bold text-[#1a365d]">
                        {formatCurrency(conversationResult.transaction_details.amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Date
                      </p>
                      <p className="text-sm font-semibold">{conversationResult.transaction_details.date}</p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Description</p>
                    <p className="text-sm mt-1">{conversationResult.transaction_details.description}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-6">
                <Button
                  onClick={submitForAnalysis}
                  className="w-full bg-[#319795] hover:bg-[#2c8785] text-lg py-6"
                  disabled={analysisLoading}
                >
                  Submit for Analysis
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Phase 3: Analysis Progress */}
        {currentPhase === 'analysis' && (
          <div className="max-w-3xl mx-auto">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Analyzing Your Dispute</CardTitle>
                <CardDescription>
                  Our AI-powered system is reviewing your case against our policies and transaction records
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{analysisStep}</span>
                    <span>{analysisProgress}%</span>
                  </div>
                  <Progress value={analysisProgress} className="h-2" />
                </div>

                {/* Timeline steps */}
                <div className="space-y-4">
                  <div className={`flex items-center gap-4 p-4 rounded-lg ${analysisProgress >= 25 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${analysisProgress >= 25 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                      {analysisProgress >= 25 ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">Retrieving Transaction Records</p>
                      <p className="text-sm text-gray-600">Querying database for related transactions and account history</p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-4 p-4 rounded-lg ${analysisProgress >= 50 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${analysisProgress >= 50 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                      {analysisProgress >= 50 ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">Checking Policy Compliance</p>
                      <p className="text-sm text-gray-600">Reviewing SOP knowledge base for applicable policies</p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-4 p-4 rounded-lg ${analysisProgress >= 75 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${analysisProgress >= 75 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                      {analysisProgress >= 75 ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">Analyzing Decision Factors</p>
                      <p className="text-sm text-gray-600">Synthesizing data against compliance rules</p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-4 p-4 rounded-lg ${analysisProgress >= 100 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${analysisProgress >= 100 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                      {analysisProgress >= 100 ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">Finalizing Decision</p>
                      <p className="text-sm text-gray-600">Generating customer-friendly resolution</p>
                    </div>
                  </div>
                </div>

                {analysisProgress === 100 && (
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Preparing your results...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Phase 4: Decision & Resolution */}
        {currentPhase === 'resolution' && resolutionResult && decisionResult && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Hero decision banner */}
            <Card className={`${getDecisionColor(resolutionResult.decision_type)} text-white`}>
              <CardContent className="pt-8 pb-8 text-center">
                <div className="flex justify-center mb-4">
                  {resolutionResult.decision_type.toLowerCase().includes('approve') ? (
                    <CheckCircle className="w-16 h-16" />
                  ) : resolutionResult.decision_type.toLowerCase().includes('deny') ? (
                    <XCircle className="w-16 h-16" />
                  ) : (
                    <AlertTriangle className="w-16 h-16" />
                  )}
                </div>
                <h2 className="text-3xl font-bold mb-2 uppercase">
                  {resolutionResult.decision_type}
                </h2>
                <p className="text-lg opacity-90 max-w-2xl mx-auto">
                  {resolutionResult.decision_summary}
                </p>
                {resolutionResult.resolution_amount && (
                  <p className="text-4xl font-bold mt-4">
                    {formatCurrency(resolutionResult.resolution_amount)}
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left column - Reasoning and evidence */}
              <div className="lg:col-span-2 space-y-4">
                {/* Detailed explanation */}
                <Card>
                  <CardHeader>
                    <CardTitle>Decision Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700">{resolutionResult.detailed_explanation}</p>
                  </CardContent>
                </Card>

                {/* Transaction evidence */}
                {conversationResult && (
                  <Collapsible
                    open={expandedSections.transaction}
                    onOpenChange={() => toggleSection('transaction')}
                  >
                    <Card>
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="cursor-pointer hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                              <DollarSign className="w-5 h-5 text-[#319795]" />
                              Transaction Evidence
                            </CardTitle>
                            {expandedSections.transaction ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
                            <div>
                              <p className="text-xs text-gray-500 font-medium">Merchant</p>
                              <p className="text-sm font-semibold">{conversationResult.transaction_details.merchant}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 font-medium">Amount</p>
                              <p className="text-sm font-semibold">{formatCurrency(conversationResult.transaction_details.amount)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 font-medium">Date</p>
                              <p className="text-sm">{conversationResult.transaction_details.date}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 font-medium">Description</p>
                              <p className="text-sm">{conversationResult.transaction_details.description}</p>
                            </div>
                          </div>
                          {sqlResult && sqlResult.account_history && (
                            <div className="p-4 bg-blue-50 rounded">
                              <p className="text-sm font-medium mb-2">Account History</p>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>Account Age: {sqlResult.account_history.account_age_days} days</div>
                                <div>Total Transactions: {sqlResult.account_history.total_transactions}</div>
                                <div>Avg Monthly Spend: {formatCurrency(sqlResult.account_history.average_monthly_spend)}</div>
                                <div>Previous Disputes: {sqlResult.account_history.previous_disputes}</div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}

                {/* Policy citations */}
                {(resolutionResult.policy_references.length > 0 || sopResult) && (
                  <Collapsible
                    open={expandedSections.policies}
                    onOpenChange={() => toggleSection('policies')}
                  >
                    <Card>
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="cursor-pointer hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                              <Shield className="w-5 h-5 text-[#319795]" />
                              Policy Citations
                            </CardTitle>
                            {expandedSections.policies ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="space-y-3">
                          {resolutionResult.policy_references.map((policy, idx) => (
                            <div key={idx} className="p-3 bg-gray-50 rounded">
                              <p className="font-medium text-sm">{policy.policy_name}</p>
                              <p className="text-xs text-gray-600 mt-1">{policy.customer_friendly_explanation}</p>
                            </div>
                          ))}
                          {sopResult && sopResult.applicable_policies && sopResult.applicable_policies.map((policy, idx) => (
                            <div key={idx} className="p-3 bg-blue-50 rounded">
                              <div className="flex items-start justify-between">
                                <p className="font-medium text-sm">{policy.policy_name}</p>
                                <Badge variant="outline" className="text-xs">{policy.policy_id}</Badge>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">{policy.description}</p>
                              <p className="text-xs text-gray-500 mt-1 italic">{policy.applies_because}</p>
                            </div>
                          ))}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}

                {/* Key findings */}
                {decisionResult.key_findings && decisionResult.key_findings.length > 0 && (
                  <Collapsible
                    open={expandedSections.findings}
                    onOpenChange={() => toggleSection('findings')}
                  >
                    <Card>
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="cursor-pointer hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                              <TrendingUp className="w-5 h-5 text-[#319795]" />
                              Key Findings
                            </CardTitle>
                            {expandedSections.findings ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="space-y-2">
                          {decisionResult.key_findings.map((finding, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                              <Badge
                                variant="outline"
                                className={
                                  finding.impact.toLowerCase().includes('positive') ? 'bg-green-100 text-green-800' :
                                  finding.impact.toLowerCase().includes('negative') ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }
                              >
                                {finding.weight}
                              </Badge>
                              <div className="flex-1">
                                <p className="text-sm font-medium">{finding.finding}</p>
                                <p className="text-xs text-gray-500 capitalize">Impact: {finding.impact}</p>
                              </div>
                            </div>
                          ))}
                          {decisionResult.risk_factors && decisionResult.risk_factors.length > 0 && (
                            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                              <p className="text-sm font-medium mb-2">Risk Factors:</p>
                              <ul className="text-xs space-y-1">
                                {decisionResult.risk_factors.map((risk, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <AlertTriangle className="w-3 h-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                                    <span>{risk}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}
              </div>

              {/* Right column - Next steps and actions */}
              <div className="space-y-4">
                {/* Next steps */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Next Steps</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {resolutionResult.next_steps.map((step, idx) => (
                        <div key={idx} className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-[#319795] text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                            {step.step_number}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{step.action}</p>
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {step.timeline}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Appeal options */}
                {resolutionResult.appeal_options.can_appeal && (
                  <Card className="border-[#319795]">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Appeal This Decision
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Deadline</p>
                        <p className="text-sm font-semibold">{resolutionResult.appeal_options.appeal_deadline}</p>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Instructions</p>
                        <p className="text-xs text-gray-700 mt-1">{resolutionResult.appeal_options.appeal_instructions}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Contact info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Contact Support</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-[#319795]" />
                      <span>{resolutionResult.contact_info.support_phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-[#319795]" />
                      <span className="text-xs">{resolutionResult.contact_info.support_email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-[#319795]" />
                      <span className="text-xs">{resolutionResult.contact_info.hours}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Action buttons */}
                <div className="space-y-2">
                  <Button
                    onClick={downloadSummary}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Summary
                  </Button>
                  <Button
                    onClick={() => copyToClipboard(resolutionResult.decision_summary)}
                    variant="outline"
                    className="w-full"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Decision
                  </Button>
                </div>
              </div>
            </div>

            {/* Questions chat */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-[#319795]" />
                  Have Questions About This Decision?
                </CardTitle>
                <CardDescription>
                  Our support agent is here to help clarify any aspects of your dispute resolution
                </CardDescription>
              </CardHeader>
              <CardContent>
                {resolutionMessages.length > 0 && (
                  <ScrollArea className="h-64 mb-4 p-4 border rounded">
                    <div className="space-y-3">
                      {resolutionMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-[#1a365d]' : 'bg-[#319795]'}`}>
                            {msg.role === 'user' ? (
                              <User className="w-4 h-4 text-white" />
                            ) : (
                              <Bot className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <div className={`flex-1 max-w-[80%] ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                            <div className={`inline-block p-3 rounded-lg ${msg.role === 'user' ? 'bg-[#1a365d] text-white' : 'bg-gray-100'}`}>
                              <p className="text-sm">{msg.content}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                )}

                <div className="flex gap-2">
                  <Input
                    placeholder="Ask a question about your decision..."
                    value={resolutionInput}
                    onChange={(e) => setResolutionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        sendResolutionQuestion()
                      }
                    }}
                    disabled={resolutionLoading}
                  />
                  <Button
                    onClick={sendResolutionQuestion}
                    disabled={resolutionLoading || !resolutionInput.trim()}
                    className="bg-[#319795] hover:bg-[#2c8785]"
                  >
                    {resolutionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
