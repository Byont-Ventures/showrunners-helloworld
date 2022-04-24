import { Inject, Service } from 'typedi';
import { Logger } from 'winston';
import config, { defaultSdkSettings } from '../../config';
import { EPNSChannel } from '../../helpers/epnschannel';
import { queryFollowerPosts, queryFollowersOfSubscribers, getHandleOfAddress } from './theGraph';

@Service()
export default class LensChannel extends EPNSChannel {
  constructor(@Inject('logger') public logger: Logger, @Inject('cached') public cached) {
    super(logger, {
      sdkSettings: {
        epnsCoreSettings: defaultSdkSettings.epnsCoreSettings,
        epnsCommunicatorSettings: defaultSdkSettings.epnsCommunicatorSettings,
        networkSettings: defaultSdkSettings.networkSettings,
      },
      networkToMonitor: config.web3KovanNetwork,
      dirname: __dirname,
      name: 'Lens',
      url: 'https://lens.dev',
      useOffChain: true,
    });
  }

  async sendDailyNewsletter(lastBlock: number) {
    try {
      let sdk = await this.getSdk();

      const subscribers = await sdk.getSubscribedUsers();
      console.log('subscribers:', subscribers);
      const followersOfSubscribers = await queryFollowersOfSubscribers(subscribers);
      const followersOfSubscribersUpdated = await queryFollowerPosts(followersOfSubscribers, lastBlock);

      followersOfSubscribersUpdated.forEach(async (s) => {
        if (s.followersHaveNewPosts) {
          const handle: string = await getHandleOfAddress(s.address)
          await this.sendNotification({
            title: 'New activity!',
            payloadTitle: 'New activity!',
            message: 'Your friends posted something new. Check it out!',
            payloadMsg: 'Your friends posted something new. Check it out!',
            notificationType: 3,
            recipient: s.address,
            cta: `https://lenster.xyz/u/${handle}`,
            simulate: false,
            image: null,
          });
        }
      });

      return { success: true };
    } catch (error) {
      this.logError(error);
    }
  }
}
