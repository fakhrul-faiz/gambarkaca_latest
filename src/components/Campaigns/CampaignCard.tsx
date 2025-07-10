import React from 'react';
import { Calendar, DollarSign, Users, Camera, Video, Clock, Tag } from 'lucide-react';
import { Campaign, Talent } from '../../types';

interface CampaignCardProps {
  campaign: Campaign;
  onApply?: () => void;
  onView?: () => void;
  showApplyButton?: boolean;
  loading?: boolean | ((campaignId: string) => boolean);
  approvedTalentDetails?: Talent[];
}

const CampaignCard: React.FC<CampaignCardProps> = ({ 
  campaign, 
  onApply, 
  onView, 
  showApplyButton = false,
  loading = false,
  approvedTalentDetails = []
}) => {
  const getMediaTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'image':
        return <Camera className="h-4 w-4" />;
      default:
        return (
          <div className="flex space-x-1">
            <Camera className="h-4 w-4" />
            <Video className="h-4 w-4" />
          </div>
        );
    }
  };

  const getRateLevelColor = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-green-100 text-green-800';
      case 2:
        return 'bg-blue-100 text-blue-800';
      case 3:
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDurationLabel = (duration: string) => {
    switch (duration) {
      case '30sec':
        return '30 Seconds';
      case '1min':
        return '1 Minute';
      case '3min':
        return '3 Minutes';
      default:
        return duration;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: 'MYR',
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3 md:mb-4">
        <div className="flex-1">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1 md:mb-2">{campaign.title}</h3>
          <p className="text-gray-600 text-xs md:text-sm mb-2 md:mb-3 line-clamp-2">{campaign.description}</p>
          
          <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-500 mb-2 md:mb-3">
            <div className="flex items-center">
              <Tag className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              <span>{campaign.productName}</span>
            </div>
            <div className="flex items-center">
              <Users className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              {campaign.applicants.length} applicants
            </div>
            <div className="flex items-center">
              {getMediaTypeIcon(campaign.mediaType)}
              <span className="ml-0.5 md:ml-1 capitalize">{campaign.mediaType}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-500">
            <div className="flex items-center">
              <Clock className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              <span>{getDurationLabel(campaign.duration)}</span>
            </div>
            <span className="px-1.5 md:px-2 py-0.5 md:py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
              {campaign.category}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col items-end space-y-1 md:space-y-2 ml-2">
          <span className={`px-1.5 md:px-2 py-0.5 md:py-1 text-xs font-medium rounded-full ${getRateLevelColor(campaign.rateLevel)}`}>
            {campaign.rateLevel} Star Level
          </span>
          <span className={`px-1.5 md:px-2 py-0.5 md:py-1 text-xs font-medium rounded-full ${
            campaign.status === 'active' ? 'bg-green-100 text-green-800' :
            campaign.status === 'completed' ? 'bg-blue-100 text-blue-800' :
            campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Product Images */}
      {campaign.productImages?.length > 0 && (
        <div className="mb-3 md:mb-4">
          <div className="flex space-x-1 md:space-x-2 overflow-x-auto">
            {campaign.productImages.slice(0, 3).map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`${campaign.productName} ${index + 1}`}
                className="w-12 h-12 md:w-16 md:h-16 object-cover rounded-lg border border-gray-200 flex-shrink-0"
              />
            ))}
            {campaign.productImages.length > 3 && (
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center text-xs text-gray-500">
                +{campaign.productImages.length - 3}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approved Talents */}
      {approvedTalentDetails?.length > 0 && (
        <div className="mb-3 md:mb-4 p-2 md:p-3 bg-green-50 rounded-lg border border-green-200">
          <h4 className="text-xs font-medium text-green-800 mb-1 md:mb-2">Approved Talents:</h4>
          <div className="flex flex-wrap gap-1 md:gap-2">
            {approvedTalentDetails.map((talent) => (
              <div key={talent.id} className="flex items-center space-x-1 bg-white px-1.5 md:px-2 py-0.5 md:py-1 rounded-full border border-green-200">
                <div className="w-4 h-4 md:w-5 md:h-5 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-green-500 to-blue-600 text-white text-xs font-bold">
                  {talent.avatar ? (
                    <img
                      src={talent.avatar}
                      alt={talent.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    talent.name.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="text-xs text-green-800 truncate max-w-[60px] md:max-w-[100px]">{talent.name}</span>
                <span className="text-xs text-green-600">({talent.rateLevel}★)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 md:pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-2 md:space-x-4">
          <div className="flex items-center text-xs md:text-sm text-gray-500">
            <Calendar className="h-3 w-3 md:h-4 md:w-4 mr-1" />
            Created {campaign.createdAt.toLocaleDateString()}
          </div>
          <div className="flex items-center text-base md:text-lg font-bold text-green-600">
            <DollarSign className="h-3 w-3 md:h-4 md:w-4 mr-1" />
            {formatCurrency(campaign.price)}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {onView && (
            <button
              onClick={onView}
              className="px-2 md:px-3 py-0.5 md:py-1 text-xs md:text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              View Details
            </button>
          )}
          {showApplyButton && onApply && (
            <button
              onClick={onApply}
              disabled={typeof loading === 'function' ? loading(campaign.id) : loading}
              className="px-3 md:px-4 py-1 md:py-2 text-xs md:text-sm text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-md transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {typeof loading === 'function' ? (loading(campaign.id) ? 'Applying...' : 'Apply Now') : loading ? 'Applying...' : 'Apply Now'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignCard;