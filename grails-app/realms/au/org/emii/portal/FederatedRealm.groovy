package au.org.emii.portal

import org.apache.shiro.authc.AccountException
import org.apache.shiro.authc.UnknownAccountException
import org.apache.shiro.authc.DisabledAccountException
import org.apache.shiro.authc.SimpleAccount
import org.apache.shiro.authc.IncorrectCredentialsException

import grails.plugins.federatedgrails.SessionRecord

import grails.plugins.federatedgrails.InstanceGenerator

class FederatedRealm {
	static authTokenClass = grails.plugins.federatedgrails.FederatedToken

	def grailsApplication

	def authenticate(token) {
		if (!grailsApplication.config.federation.enabled) {
			log.error "Authentication attempt for federated provider, denying attempt as federation integration disabled"
			throw new UnknownAccountException("Authentication attempt for federated provider, denying attempt as federation disabled")
		}
		if (!token.principal) {
			log.error "Authentication attempt for federated provider, denying attempt as no persistent identifier was provided"
			throw new UnknownAccountException("Authentication attempt for federated provider, denying attempt as no persistent identifier was provided")
		}
		if (!token.credential) {
			log.error "Authentication attempt for federated provider, denying attempt as no credential was provided"
			throw new UnknownAccountException("Authentication attempt for federated provider, denying attempt as no credential was provided")
		}

		User.withTransaction {
			User user = User.findByOpenIdUrl(token.principal)

			if (!user) {
				throw new UnknownAccountException( "No account found for user with principal ${ token.principal }" )
//				if (!grailsApplication.config.federation.autoprovision) {
//					log.error "Authentication attempt for federated provider, denying attempt as federation integration is denying automated account provisioning"
//					throw new DisabledAccountException("Authentication attempt for federated provider, denying attempt as federation integration is denying automated account provisioning")
//				}
//
//				// Here we don't already have a subject stored in the system so we need to create one
//				log.info "No subject represented by ${token.principal} exists in local repository, provisioning new account"
//
//				user = InstanceGenerator.subject()
//				user.principal = token.principal
//				user.enabled = true
//
//				/*
//				  TODO:
//				  The default implementation doesn't store attributes. If you've extended
//				  your subject attribute here is the place to populate it with federated values.
//
//				  e.g:
//
//				  subject.displayName.value = token.attributes.displayName
//				*/
//
//				// Store in data repository
//				if (!user.save()) {
//					user.errors.each { err ->
//						log.error err
//					}
//					throw new RuntimeException("Account creation exception for new federated account for ${token.principal}")
//				}
			} else {
				/*
				  TODO:
				  If you have attributes specific to your application that may change on the IdP side
				  such as names, email addresses, entitlements and the like you'll want to update those
				  in this code block e.g:

				  subject.displayName.value = token.attributes.displayName
				  ...
				  subject.save()
				  ...

				  This is also a useful spot to check for newly released attributes and update existing accounts
				*/
			}

//			if (!user.enabled) {
//				log.warn("Attempt to authenticate using using federated principal mapped to a locally disabled account [${user.id}]${user.principal}")
//				throw new DisabledAccountException("Attempt to authenticate using using federated principal mapped to a locally disabled account [${user.id}]${user.principal}")
//			}

//			// All done the security context is successfully established
//			def sessionRecord = new SessionRecord(credential: token.credential, remoteHost: token.remoteHost, userAgent: token.userAgent)
//			user.addToSessionRecords(sessionRecord)
//			if (!user.save()) {
//				user.errors.each { err ->
//					log.error err
//				}
//				throw new RuntimeException("Account modification for ${token.principal} when adding new session record")
//			}

			log.info "Successfully logged in subject [$user.id]$user.principal using federated source"
			def account = new SimpleAccount(user.id, token.credential, "aaf.sp.groovy.shiro.FederatedToken")
			return account
		}

	}

}