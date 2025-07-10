import React, { useState } from 'react';
import { FileText, Search, Filter, Eye, CheckCircle, Clock, Star, Calendar, User, Package, Download, ThumbsUp, ThumbsDown, Video } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Order, Founder, Transaction, Earning } from '../../types';
import ReviewDetailsModal from './ReviewDetailsModal';
import { deleteReviewMedia, updateOrder, createEarning, createTransaction } from '../../lib/api';

const ReviewsPage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { orders, setOrders, earnings, setEarnings, transactions, setTransactions, refreshData } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReview, setSelectedReview] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);

  // Filter orders for the current founder that have been delivered or have reviews
  const founderReviews = orders.filter(order => 
    order.founderId === user?.id && 
    (order.status === 'delivered' || order.status === 'review_submitted' || order.status === 'completed')
  );

  // Apply search and status filters
  const filteredReviews = founderReviews.filter(review => {
    const matchesSearch = review.talentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         review.campaignTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         review.productName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || review.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: 'MYR',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-purple-100 text-purple-800';
      case 'review_submitted':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Clock className="h-4 w-4" />;
      case 'review_submitted':
        return <FileText className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'Awaiting Review';
      case 'review_submitted':
        return 'Review Submitted';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'Product delivered! Waiting for talent to submit review content.';
      case 'review_submitted':
        return 'Review content submitted and ready for your approval.';
      case 'completed':
        return 'Review approved and talent has been paid.';
      default:
        return '';
    }
  };

 const handleApproveReview = async (orderId: string) => {
  setLoading(true);
  try {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const talentPayment = order.payout;
    const adminFee = talentPayment * 0.1;
    const totalDeduction = talentPayment + adminFee;
    await updateOrder(orderId, { status: 'completed' });
    await createEarning({
      talentId: order.talentId,
      orderId: order.id,
      campaignTitle: order.campaignTitle,
      amount: order.payout,
      status: 'paid',
      paidAt: new Date()
    });
    await createTransaction({
      userId: order.talentId,
      type: 'credit',
      amount: talentPayment,
      description: `Payment Received - ${order.campaignTitle}`,
      relatedJobId: orderId
    });
    await createTransaction({
      userId: order.founderId,
      type: 'debit',
      amount: totalDeduction,
      description: `Campaign Payout - ${order.campaignTitle} (includes 10% admin fee)`,
      relatedJobId: orderId
    });
    await createTransaction({
      userId: '066e9f3d-9570-405e-8a43-ab1ed542e9a7',
      type: 'credit',
      amount: adminFee,
      description: `Admin Fee (10%) - ${order.campaignTitle}`,
      relatedJobId: orderId
    });

        // 1. Fetch talent's latest profile
    const { data: talentProfile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', order.talentId)
      .single();
    if (error || !talentProfile) throw error || new Error('Talent profile not found');

    // 2. Calculate new total earnings
    const newTotalEarnings = (Number(talentProfile.total_earning) || 0) + talentPayment;

    // 3. Update talent's profile with new total earnings
    await updateProfile(order.talentId, { total_earning: newTotalEarnings });
    
    const founder = user as Founder;
    if (founder && updateProfile) {
      const updatedFounder: Founder = {
        ...founder,
        walletBalance: founder.walletBalance - totalDeduction,
      };
      await updateProfile(updatedFounder);
    }
    await refreshData();
  } catch (error) {
    alert('Failed to approve review. Please try again.');
    console.error('handleApproveReview error:', error);
  } finally {
    setLoading(false);
  }
};

  const handleRejectReview = async (orderId: string) => {
    const order = orders.find(order => order.id === orderId);
    if (!order) return;
    try {
     if (
      order.reviewSubmission &&
      Array.isArray(order.reviewSubmission.media) &&
      order.reviewSubmission.media.length > 0
    ) {
      for (const mediaItem of order.reviewSubmission.media) {
        if (mediaItem.url) {
          await deleteReviewMedia(order.id, mediaItem.url);
        }
      }
    }
      await updateOrder(orderId, {
        status: 'delivered',
        review_media: null,
        review_submitted_at: null,
      });
      setOrders(prev =>
        prev.map(o =>
          o.id === orderId
            ? { ...o, status: 'delivered', reviewSubmission: undefined }
            : o
        )
      );
      if (typeof refreshData === 'function') {
        await refreshData();
      }
    } catch (err: any) {
      alert('Failed to reject review: ' + (err.message || err));
      console.error('handleRejectReview error:', err);
    }
  };

  const getDaysAgo = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6 pb-6 sm:pb-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-gray-600 text-sm sm:text-base">Monitor talent job progress and review submissions</p>
        </div>
      </div>

      {/* Payment Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 sm:p-4 border border-blue-200 text-sm">
        <div className="flex items-start gap-2">
          <Star className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1 text-base">Payment Information</h4>
            <p className="text-blue-700">
              When you approve a review, the talent will receive their payment as shown in the campaign price. 
              Additionally, a 10% admin fee will be charged to support platform operations.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex items-center">
          <div className="p-2 rounded-lg bg-purple-500">
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div className="ml-3">
            <p className="text-xs font-medium text-gray-600">Awaiting Reviews</p>
            <p className="text-lg font-bold text-gray-900">
              {founderReviews.filter(r => r.status === 'delivered').length}
            </p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex items-center">
          <div className="p-2 rounded-lg bg-green-500">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div className="ml-3">
            <p className="text-xs font-medium text-gray-600">Pending Approval</p>
            <p className="text-lg font-bold text-gray-900">
              {founderReviews.filter(r => r.status === 'review_submitted').length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex items-center">
          <div className="p-2 rounded-lg bg-blue-500">
            <CheckCircle className="h-5 w-5 text-white" />
          </div>
          <div className="ml-3">
            <p className="text-xs font-medium text-gray-600">Completed</p>
            <p className="text-lg font-bold text-gray-900">
              {founderReviews.filter(r => r.status === 'completed').length}
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search by talent, campaign, or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border text-sm border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="delivered">Awaiting Review</option>
            <option value="review_submitted">Review Submitted</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
{/* Reviews List */}
{filteredReviews.length > 0 ? (
  <div className="flex flex-col gap-4">
    {filteredReviews.map((review) => {
      const talentPayment = review.payout;
      const adminFee = talentPayment * 0.1;
      const totalCost = talentPayment + adminFee;

      return (
        <div
          key={review.id}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col gap-2 sm:gap-0 sm:p-6"
        >
          {/* Top Row: Title, status, Eye button */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 items-center mb-2">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-all">{review.campaignTitle}</h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center space-x-1 ${getStatusColor(review.status)}`}>
                  {getStatusIcon(review.status)}
                  <span>{getStatusLabel(review.status)}</span>
                </span>
              </div>
            </div>
            {/* Eye Button at the right always */}
            <button
              onClick={() => setSelectedReview(review)}
              className="p-2 ml-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>

          <p className="text-gray-600 text-xs sm:text-sm mb-3">{getStatusDescription(review.status)}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 mb-3">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">
                Product: <span className="font-medium text-gray-900">{review.productName}</span>
              </p>
              <div className="flex items-center mt-1">
                <User className="h-4 w-4 text-gray-400 mr-1" />
                <p className="text-xs sm:text-sm text-gray-600">
                  Talent: <span className="font-medium text-gray-900">{review.talentName}</span>
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600">
                Talent Payment: <span className="font-medium text-green-600">{formatCurrency(talentPayment)}</span>
              </p>
              <div className="flex items-center mt-1">
                <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                <p className="text-xs sm:text-sm text-gray-600">
                  Delivered: {getDaysAgo(review.createdAt)} days ago
                </p>
              </div>
            </div>
          </div>
          {/* Payment Breakdown */}
          {review.status === 'review_submitted' && (
            <div className="mt-3 p-2 sm:p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="text-xs sm:text-sm font-medium text-yellow-800 mb-1 sm:mb-2">Payment Breakdown (upon approval):</h4>
              <div className="space-y-1 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-yellow-700">Talent Payment:</span>
                  <span className="font-medium text-yellow-900">{formatCurrency(talentPayment)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-700">Admin Fee (10%):</span>
                  <span className="font-medium text-yellow-900">{formatCurrency(adminFee)}</span>
                </div>
                <div className="border-t border-yellow-300 pt-1 mt-2">
                  <div className="flex justify-between">
                    <span className="font-medium text-yellow-800">Total Deduction:</span>
                    <span className="font-bold text-yellow-900">{formatCurrency(totalCost)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Review Progress */}
          <div className="mt-3 p-2 sm:p-3 bg-gray-50 rounded-lg flex flex-col gap-2">
            <div className="flex flex-row items-center gap-4 justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-xs sm:text-sm text-gray-600">Product Delivered</span>
              </div>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  review.reviewSubmission ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                <span className="text-xs sm:text-sm text-gray-600">Review Submitted</span>
              </div>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  review.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                <span className="text-xs sm:text-sm text-gray-600">Approved</span>
              </div>
            </div>
          </div>

          {/* Review Submission Preview */}
          {review.reviewSubmission && (
            <div className="mt-3 p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                {review.reviewSubmission.media && review.reviewSubmission.media.length > 0 && (
                  <>
                    <div className="relative w-20 h-20 rounded-lg border border-green-200 overflow-hidden flex-shrink-0">
                      {review.reviewSubmission.media[0].type === 'image' ? (
                        <img
                          src={review.reviewSubmission.media[0].url}
                          alt="Review submission"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <Video className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-green-700">
                        {review.reviewSubmission.media[0].type === 'image' ? 'Image' : 'Video'} content
                        {review.reviewSubmission.media.length > 1 && 
                          ` (+${review.reviewSubmission.media.length - 1} more)`}
                      </p>
                      <p className="text-xs text-green-600">
                        Ready for your review and approval
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Approve/Reject Buttons: below all other info, right-aligned */}
          {review.status === 'review_submitted' && (
            <div className="flex gap-1 mt-4 justify-end flex-wrap">
              <button
                onClick={() => handleApproveReview(review.id)}
                className="px-3 py-1 text-xs sm:text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center space-x-1"
                title="Approve Review"
              >
                <ThumbsUp className="h-3 w-3" />
                <span>Approve</span>
              </button>
              <button
                onClick={() => handleRejectReview(review.id)}
                className="px-3 py-1 text-xs sm:text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center space-x-1"
                title="Request Revision"
              >
                <ThumbsDown className="h-3 w-3" />
                <span>Revise</span>
              </button>
            </div>
          )}
        </div>
      );
    })}
  </div>
) : (
  <div className="text-center py-12">
    <div className="text-gray-500">
      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
      <h3 className="text-lg font-medium mb-2">No reviews found</h3>
      <p className="text-sm">
        {searchTerm || statusFilter !== 'all' 
          ? 'Try adjusting your search or filters' 
          : 'Reviews will appear here after products are delivered to talents'
        }
      </p>
    </div>
  </div>
)}


      {/* Review Details Modal */}
      {selectedReview && (
        <ReviewDetailsModal
          review={selectedReview}
          onClose={() => setSelectedReview(null)}
          onApprove={() => handleApproveReview(selectedReview.id)}
          onReject={() => handleRejectReview(selectedReview.id)}
        />
      )}
    </div>
  );
};

export default ReviewsPage;
