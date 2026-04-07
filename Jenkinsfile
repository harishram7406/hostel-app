// Jenkins Declarative Pipeline — Hostel Social (client + server)
// Requires: Node.js + npm on the agent (configure via Jenkins "Global Tool Configuration" or preinstalled PATH).
// Multibranch / Pipeline from SCM: point Jenkins at this repo and Jenkinsfile path.

pipeline {
    agent any

    // Auto-build when origin/main changes: Jenkins polls GitHub on a schedule (no inbound URL needed).
    // Cron: H/5 = ~every 5 min (spread load). Use H/15 * * * * for every 15 min.
    triggers {
        pollSCM('H/5 * * * *')
    }

    options {
        timestamps()
        disableConcurrentBuilds(abortPrevious: true)
        buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '5'))
    }

    environment {
        CI = 'true'
        // Optional: set in Jenkins job if your client needs these at build time
        // REACT_APP_API_URL = 'https://api.example.com/api'
    }

    stages {
        stage('Install server') {
            steps {
                dir('server') {
                    script {
                        if (isUnix()) {
                            sh 'npm ci'
                        } else {
                            bat 'npm ci'
                        }
                    }
                }
            }
        }

        stage('Install client & build') {
            steps {
                dir('client') {
                    script {
                        if (isUnix()) {
                            sh 'npm ci'
                            sh 'npm run build'
                        } else {
                            bat 'npm ci'
                            bat 'npm run build'
                        }
                    }
                }
            }
        }

        stage('Server sanity') {
            steps {
                dir('server') {
                    script {
                        // Quick check that main entry parses (no long-running server)
                        if (isUnix()) {
                            sh 'node --check server.js'
                        } else {
                            bat 'node --check server.js'
                        }
                    }
                }
            }
        }
    }

    post {
        success {
            archiveArtifacts artifacts: 'client/build/**/*', fingerprint: true, onlyIfSuccessful: true
        }
        failure {
            echo 'Build failed — check logs above.'
        }
    }
}
