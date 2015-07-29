#!/bin/bash

SCRIPT="$0"
VERSION=`node -e "console.log(require('./package').version);"`

IFS=. read MAJOR MINOR PATCH <<< "${VERSION}"

OPTION_NO_ACT=false
OPTION_REMOTE_REPO='adminion'
OPTION_RELEASE_SUFFIX=
OPTION_VERBOSE=false

CURRENT_BRANCH_PATTERN='^\* .+$'
MAJOR_BRANCH_PATTERN='v[0-9].x'

SCRATCH_FILE='./.git-branch-output'
CURRENT_BRANCH=`git branch | egrep "${CURRENT_BRANCH_PATTERN}" | sed s/\*\ // -`

releaseType='patch'

usage() {
  echo "Usage: release-helper [ [ --option-1 [...]] ]  [ major | minor | (patch) ]      "
  echo
  echo "Options:                                                                        "
  echo "  -h, --help                    Display this help message                       "
  echo "  -n, --no-act                  Don't actually do anything, just output what    "
  echo "  -v, --verbose                 Enable verbose output                           "
  echo "  -o, --output-only             Alias of -n, --no-act                           "
  echo "                                  would be done without this flag.              "
  echo "  -p, --push-to-remote REMOTE   Push the new release to REMOTE                  "
  echo "  -r, --remote REMOTE           Alias of -p, --push-to-remote                   "
  echo "  -s, --suffix SUFFIX           Append SUFFIX to the release name (i.e. -alpha1)"
  echo "  -m, --meta SUFFIX             Alias of -s, --suffix                           "
  echo
}

major_release() {

  RELEASE="v${VERSION}"
  BRANCH="v${MAJOR}.x"
  WORKING_ON="v`expr ${MAJOR} + 1`.0.0"

  echo "Building release ${RELEASE}..."

  if $OPTION_VERBOSE 
    then
      echo "RELEASE: ${RELEASE}"
      echo "BRANCH: ${BRANCH}"
      echo "'WORKING_ON': ${WORKING_ON}"
  fi

  git checkout -b release-$RELEASE
  sed -i "4i # ${BRANCH}\n\n## ${RELEASE}\n`changelog-maker`\n" CHANGES.md
  npm update
  # npm test
  # npm run coverage
  # npm run docs
  git commit -a -m "release ${RELEASE}"
  git checkout master
  git merge release-$RELEASE
  git tag $RELEASE
  git branch $BRANCH
  # git push $OPTION_REMOTE_REPO $RELEASE $BRANCH
  # npm publish
  npm --no-git-tag-version version major
  git commit -a -m "working on ${WORKING_ON}"
}

minor_release() {
  RELEASE="v$MAJOR.`expr $MINOR + 1`.0"
  BRANCH="v${MAJOR}.x"
  WORKING_ON="V$MAJOR.`expr $MINOR + 1`.1"

  echo "Building release ${RELEASE}..."

  if $OPTION_VERBOSE 
    then
    echo "RELEASE: ${RELEASE}"
    echo "BRANCH: ${BRANCH}"
    echo "'WORKING_ON': ${WORKING_ON}"
  fi

  git checkout -b release-$RELEASE
  npm --no-git-tag-version version minor
  sed -i "6i ## ${RELEASE}\n`changelog-maker`\n" CHANGES.md
  # npm update
  # npm test
  # npm run coverage
  # npm run docs
  git commit -a -m "release ${RELEASE}"
  git checkout $BRANCH
  git merge release-$RELEASE
  git tag $RELEASE
  # git push $OPTION_REMOTE_REPO $RELEASE $BRANCH
  # npm publish
  npm --no-git-tag-version version minor
  git commit -a -m "working on ${WORKING_ON}"
}

patch_release() {

  RELEASE="v$VERSION"
  BRANCH="v${MAJOR}.x"
  WORKING_ON="v${MAJOR}.${MINOR}.`expr ${PATCH} + 1`"

  echo "Building release ${RELEASE}..."

  if $OPTION_VERBOSE 
    then
      echo "RELEASE:      ${RELEASE}"
      echo "BRANCH:       ${BRANCH}"
      echo "'WORKING_ON': ${WORKING_ON}"
  fi

  git checkout -b release-$RELEASE
  npm --no-git-tag-version version minor
  sed -i "6i ## ${RELEASE}\n`changelog-maker`\n" CHANGES.md
  # npm update
  # npm test
  # npm run coverage
  # npm run docs
  git commit -a -m "release ${RELEASE}"
  git checkout $BRANCH
  git merge release-$RELEASE
  git tag $RELEASE
  # git push $OPTION_REMOTE_REPO $RELEASE $BRANCH
  # npm publish
  npm --no-git-tag-version version minor
  git commit -a -m "working on ${WORKING_ON}"
}


################

# Loop until all parameters are used up
while [ "$1" != "" ]; do
  case $1 in
    -n | --no-act | \
    -o | --output-only )      OPTION_NO_ACT=1
                              ;;
    -r | --remote | \
    -p | --push-to-remote )   shift
                              OPTION_REMOTE_REPO=$1
                              ;;
    -m | --meta | \
    -s | --suffix )           shift
                              OPTION_SUFFIX=$1
                              ;;
    -v | --verbose )          OPTION_VERBOSE=true
                              ;;
    -h | --help )             usage
                              exit
                              ;;
    major )                   releaseType="major"
                              ;;
    minor )                   releaseType="minor"
                              ;;
    patch )                   releaseType="patch"
                              ;;
    * )                       usage
                              exit 1
  esac

  # Shift all the parameters down by one
  shift

done

if $OPTION_VERBOSE
  then 
    echo "REMOTE_REPO:    $OPTION_REMOTE_REPO"
    echo "VERSION:        $VERSION"
    echo "CURRENT_BRANCH: $CURRENT_BRANCH"
fi



case "$releaseType" in
  major )   if [ $CURRENT_BRANCH == "master" ] 
              then major_release 
            else 
                echo 'Major releases must be cut from master!'
                exit 1
            fi
            ;;
  minor )   if  `echo ${CURRENT_BRANCH} | egrep "${MAJOR_BRANCH_PATTERN}" 1>/dev/null 2>&1` 
              then minor_release 
            else 
                echo 'Minor releases must be cut from a major branch!'
                exit 1
            fi
            ;;
  
  patch )   if  `echo ${CURRENT_BRANCH} | egrep "${MAJOR_BRANCH_PATTERN}" 1>/dev/null 2>&1` 
              then patch_release 
            else 
                echo 'patch releases must be cut from a major branch!'
                exit 1
            fi
            ;;
esac
